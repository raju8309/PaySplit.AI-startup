# backend/routes/plaid.py
# PaySplit AI - Plaid Integration
# Handles bank linking, balance sync, and ACH transfers

import os
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/plaid", tags=["Plaid"])

# ── Plaid client setup ────────────────────────────────────────────────────────
def get_plaid_client():
    env = os.getenv("PLAID_ENV", "sandbox")
    configuration = plaid.Configuration(
        host=plaid.Environment.Sandbox if env == "sandbox" else plaid.Environment.Production,
        api_key={
            "clientId": os.getenv("PLAID_CLIENT_ID"),
            "secret": os.getenv("PLAID_SECRET"),
        },
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)

# ── In-memory store ───────────────────────────────────────────────────────────
# TODO (SECURITY): Plaid access_tokens grant full bank account access and must
# NOT be stored in memory. They are lost on restart and shared across instances.
# Replace this with an encrypted DB column on the User model:
#   User.plaid_access_token = Column(EncryptedString, nullable=True)
# Use a library like sqlalchemy-utils EncryptedType with AES and a secret key.
# Maps user_id -> access_token (TEMPORARY — development only)
_access_tokens: dict = {}

# ── Models ────────────────────────────────────────────────────────────────────
class ExchangeTokenRequest(BaseModel):
    public_token: str
    user_id: Optional[str] = "default"

class BalanceSyncRequest(BaseModel):
    user_id: Optional[str] = "default"

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/link-token")
async def create_link_token(request: Request):
    """
    Step 1: Create a Plaid Link token.
    Frontend uses this to open the Plaid Link UI where user connects their bank.
    """
    try:
        client = get_plaid_client()

        # Get user info from token if available
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user_id = token[:20] if token else "default_user"

        req = LinkTokenCreateRequest(
            products=[Products("transactions"), Products("auth")],
            client_name="PaySplit AI",
            country_codes=[CountryCode("US")],
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id=user_id),
        )

        response = client.link_token_create(req)
        return {"link_token": response["link_token"]}

    except plaid.ApiException as e:
        raise HTTPException(status_code=400, detail=str(e.body))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exchange-token")
async def exchange_public_token(req: ExchangeTokenRequest):
    """
    Step 2: Exchange the public token from Plaid Link for an access token.
    Store the access token securely — used for all future API calls.
    """
    try:
        client = get_plaid_client()

        exchange_req = ItemPublicTokenExchangeRequest(
            public_token=req.public_token
        )
        response = client.item_public_token_exchange(exchange_req)
        access_token = response["access_token"]
        item_id = response["item_id"]

        # Store access token (use encrypted DB in production)
        _access_tokens[req.user_id] = access_token

        return {
            "success": True,
            "item_id": item_id,
            "user_id": req.user_id,
        }

    except plaid.ApiException as e:
        raise HTTPException(status_code=400, detail=str(e.body))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/balances/{user_id}")
async def get_balances(user_id: str = "default"):
    """
    Step 3: Get real-time balances for all accounts linked by this user.
    Returns account name, type, balance, and limit.
    """
    try:
        access_token = _access_tokens.get(user_id)
        if not access_token:
            raise HTTPException(
                status_code=404,
                detail="No linked bank account found. Please connect your bank first."
            )

        client = get_plaid_client()
        req = AccountsBalanceGetRequest(access_token=access_token)
        response = client.accounts_balance_get(req)

        accounts = []
        for account in response["accounts"]:
            balances = account["balances"]
            accounts.append({
                "account_id": account["account_id"],
                "name": account["name"],
                "official_name": account.get("official_name"),
                "type": str(account["type"]),
                "subtype": str(account.get("subtype", "")),
                "current_balance": balances.get("current"),
                "available_balance": balances.get("available"),
                "credit_limit": balances.get("limit"),
                "currency": balances.get("iso_currency_code", "USD"),
            })

        return {"accounts": accounts, "user_id": user_id}

    except plaid.ApiException as e:
        raise HTTPException(status_code=400, detail=str(e.body))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{user_id}")
async def get_link_status(user_id: str = "default"):
    """Check if a user has linked their bank account"""
    is_linked = user_id in _access_tokens
    return {"user_id": user_id, "is_linked": is_linked}