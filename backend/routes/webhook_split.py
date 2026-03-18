# backend/routes/webhook_split.py
# PaySplit AI - Webhook Split Engine

import os
import json
import stripe
import plaid
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, JSONResponse
from dotenv import load_dotenv
from plaid.api import plaid_api
from plaid.model.transfer_authorization_create_request import TransferAuthorizationCreateRequest
from plaid.model.transfer_create_request import TransferCreateRequest
from plaid.model.transfer_type import TransferType
from plaid.model.transfer_network import TransferNetwork
from plaid.model.ach_class import ACHClass
from plaid.model.transfer_user_in_request import TransferUserInRequest

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["Webhook"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

# ── In-memory split store ─────────────────────────────────────────────────────
_split_preferences: dict = {}
_plaid_access_tokens: dict = {}
_plaid_account_ids: dict = {}


# ── Plaid client ──────────────────────────────────────────────────────────────
def get_plaid_client():
    env = os.getenv("PLAID_ENV", "sandbox")
    configuration = plaid.Configuration(
        host=plaid.Environment.Sandbox if env == "sandbox" else plaid.Environment.Production,
        api_key={
            "clientId": os.getenv("PLAID_CLIENT_ID"),
            "secret": os.getenv("PLAID_SECRET"),
        },
    )
    return plaid_api.PlaidApi(plaid.ApiClient(configuration))


# ── Helper: charge a real card via Plaid ACH ─────────────────────────────────
async def charge_real_card_via_plaid(
    access_token: str,
    account_id: str,
    amount_cents: int,
    description: str,
    user_name: str = "PaySplit User",
) -> dict:
    try:
        client = get_plaid_client()
        amount_dollars = f"{amount_cents / 100:.2f}"

        auth_req = TransferAuthorizationCreateRequest(
            access_token=access_token,
            account_id=account_id,
            type=TransferType("debit"),
            network=TransferNetwork("ach"),
            amount=amount_dollars,
            ach_class=ACHClass("ppd"),
            user=TransferUserInRequest(legal_name=user_name),
        )
        auth_response = client.transfer_authorization_create(auth_req)
        authorization_id = auth_response["authorization"]["id"]
        decision = auth_response["authorization"]["decision"]

        if decision != "approved":
            return {
                "success": False,
                "reason": f"Transfer not approved: {decision}",
                "authorization_id": authorization_id,
            }

        transfer_req = TransferCreateRequest(
            authorization_id=authorization_id,
            description=description[:15],
        )
        transfer_response = client.transfer_create(transfer_req)
        transfer = transfer_response["transfer"]

        return {
            "success": True,
            "transfer_id": transfer["id"],
            "amount": amount_dollars,
            "status": transfer["status"],
        }

    except plaid.ApiException as e:
        logger.error(f"Plaid transfer failed: {e.body}")
        return {"success": False, "reason": str(e.body)}
    except Exception as e:
        logger.error(f"Transfer error: {e}")
        return {"success": False, "reason": str(e)}


# ── Main webhook endpoint ─────────────────────────────────────────────────────
@router.post("/stripe/issuing")
async def stripe_issuing_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    webhook_secret = os.getenv("STRIPE_ISSUING_WEBHOOK_SECRET", "")

    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            event = json.loads(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    event_type = event.get("type", "")
    logger.info(f"[Webhook] Received: {event_type}")

    # ── Real-time authorization request ───────────────────────────────────────
    # Stripe requires an EMPTY 200 response to approve in the new API
    if event_type == "issuing_authorization.request":
        auth = event["data"]["object"]
        amount = auth["amount"]
        merchant = auth["merchant_data"]["name"]
        card_id = auth["card"] if isinstance(auth["card"], str) else auth["card"]["id"]

        logger.info(f"[Webhook] Auth request: ${amount/100:.2f} at {merchant} on {card_id}")

        # Return empty 200 — this is what Stripe's new API requires to approve
        return Response(status_code=200)

    # ── Authorization created (approved) ──────────────────────────────────────
    if event_type == "issuing_authorization.created":
        auth = event["data"]["object"]
        amount = auth["amount"]
        merchant = auth["merchant_data"]["name"]
        card_id = auth["card"] if isinstance(auth["card"], str) else auth["card"]["id"]

        logger.info(f"[Webhook] Charge approved: ${amount/100:.2f} at {merchant}")

        splits = _split_preferences.get(card_id, [])
        if not splits:
            logger.warning(f"[Webhook] No splits for card {card_id}")
            return JSONResponse(content={"status": "no_splits_configured"})

        split_results = []
        for split in splits:
            split_amount_cents = int(amount * split["percentage"])
            card_name = split["card_name"]

            access_token = _plaid_access_tokens.get(str(split["card_id"]))
            account_id = _plaid_account_ids.get(str(split["card_id"]))

            if not access_token or not account_id:
                logger.warning(f"[Webhook] No Plaid token for {card_name} — logging only")
                split_results.append({
                    "card": card_name,
                    "amount_cents": split_amount_cents,
                    "status": "plaid_not_linked",
                })
                continue

            result = await charge_real_card_via_plaid(
                access_token=access_token,
                account_id=account_id,
                amount_cents=split_amount_cents,
                description=f"PaySplit-{merchant[:10]}",
            )

            split_results.append({
                "card": card_name,
                "amount_cents": split_amount_cents,
                "percentage": split["percentage"],
                **result,
            })

        logger.info(f"[Webhook] Splits: {split_results}")
        return JSONResponse(content={
            "status": "splits_executed",
            "total_cents": amount,
            "merchant": merchant,
            "splits": split_results,
        })

    # ── Transaction settled ───────────────────────────────────────────────────
    if event_type == "issuing_transaction.created":
        txn = event["data"]["object"]
        amount = abs(txn["amount"])
        merchant = txn["merchant_data"]["name"]
        logger.info(f"[Webhook] Transaction settled: ${amount/100:.2f} at {merchant}")
        return JSONResponse(content={"status": "transaction_logged"})

    return JSONResponse(content={"status": "ignored", "type": event_type})


# ── Register split preferences ────────────────────────────────────────────────
@router.post("/register-splits")
async def register_splits(request: Request):
    data = await request.json()
    card_id = data.get("card_id")
    splits = data.get("splits", [])
    _split_preferences[card_id] = splits
    logger.info(f"[Webhook] Registered splits for {card_id}: {splits}")
    return {"status": "registered", "card_id": card_id}


# ── Test split simulation ─────────────────────────────────────────────────────
@router.post("/test-split")
async def test_split(request: Request):
    data = await request.json()
    card_id = data.get("card_id")
    amount = data.get("amount_cents", 5000)
    merchant = data.get("merchant", "Test Merchant")

    splits = _split_preferences.get(card_id, [])
    if not splits:
        return {"error": f"No splits configured for card {card_id}"}

    simulation = []
    for split in splits:
        split_amount = int(amount * split["percentage"])
        simulation.append({
            "card": split["card_name"],
            "percentage": f"{split['percentage']*100:.0f}%",
            "amount": f"${split_amount/100:.2f}",
            "amount_cents": split_amount,
        })

    return {
        "simulation": True,
        "total": f"${amount/100:.2f}",
        "merchant": merchant,
        "splits": simulation,
    }