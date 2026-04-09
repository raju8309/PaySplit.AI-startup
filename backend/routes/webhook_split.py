# backend/routes/webhook_split.py
# PaySplit AI - Webhook Split Engine (DB-backed) - UPDATED FOR MULTI-PERSON SPLITS

import os
import json
import stripe
import plaid
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from plaid.api import plaid_api
from plaid.model.transfer_authorization_create_request import TransferAuthorizationCreateRequest
from plaid.model.transfer_create_request import TransferCreateRequest
from plaid.model.transfer_type import TransferType
from plaid.model.transfer_network import TransferNetwork
from plaid.model.ach_class import ACHClass
from plaid.model.transfer_user_in_request import TransferUserInRequest
from datetime import datetime

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["Webhook"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")


# ── DB helper ─────────────────────────────────────────────────────────────────
def get_db():
    from db import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session():
    from db import SessionLocal
    return SessionLocal()


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
            return {"success": False, "reason": f"Transfer not approved: {decision}"}

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

    # ── Real-time authorization — empty 200 = approve ─────────────────────────
    if event_type == "issuing_authorization.request":
        auth = event["data"]["object"]
        amount = auth["amount"]
        merchant = auth["merchant_data"]["name"]
        card_id = auth["card"] if isinstance(auth["card"], str) else auth["card"]["id"]
        logger.info(f"[Webhook] Auth request: ${amount/100:.2f} at {merchant} on {card_id}")
        return Response(status_code=200)

    # ── Authorization created — run split engine (UPDATED FOR MULTI-PERSON) ────
    if event_type == "issuing_authorization.created":
        auth = event["data"]["object"]
        amount = auth["amount"]
        merchant = auth["merchant_data"]["name"]
        card_id = auth["card"] if isinstance(auth["card"], str) else auth["card"]["id"]

        logger.info(f"[Webhook] Charge approved: ${amount/100:.2f} at {merchant}")

        try:
            db = get_db_session()
            
            # ── CHECK FOR MULTI-PERSON SPLIT ──────────────────────────────────
            from models.split_transaction import SplitTransaction, SplitParticipant
            
            # Look up SplitTransaction with split_type = "multi_person"
            split_txn = db.query(SplitTransaction).filter(
                SplitTransaction.stripe_card_id == card_id,
                SplitTransaction.status == "pending",
                SplitTransaction.split_type == "multi_person"
            ).first()

            if split_txn:
                # ── MULTI-PERSON SPLIT HANDLER ────────────────────────────────
                logger.info(f"[Webhook] Multi-person split detected: {split_txn.id}")
                
                # Get all approved participants
                participants = db.query(SplitParticipant).filter(
                    SplitParticipant.split_transaction_id == split_txn.id,
                    SplitParticipant.status == "approved"
                ).all()

                if not participants:
                    logger.warning(f"[Webhook] No approved participants for {split_txn.id}")
                    db.close()
                    return JSONResponse(
                        content={"status": "error", "detail": "No approved participants"},
                        status_code=400
                    )

                split_results = []
                all_charged = True

                # Charge each participant's card
                for participant in participants:
                    amount_to_charge = int(participant.amount_cents)

                    if not participant.plaid_access_token or not participant.plaid_account_id:
                        logger.warning(f"[Webhook] No Plaid credentials for {participant.id}")
                        participant.status = "failed"
                        split_results.append({
                            "user_id": participant.user_id,
                            "amount_cents": amount_to_charge,
                            "status": "failed",
                            "reason": "plaid_missing"
                        })
                        all_charged = False
                        continue

                    # Charge via Plaid ACH
                    result = await charge_real_card_via_plaid(
                        access_token=participant.plaid_access_token,
                        account_id=participant.plaid_account_id,
                        amount_cents=amount_to_charge,
                        description=f"PaySplit-{merchant[:10]}",
                        user_name=f"User-{participant.user_id[:8]}"
                    )

                    if result["success"]:
                        participant.status = "charged"
                        participant.charged_at = datetime.utcnow()
                        participant.plaid_transfer_id = result.get("transfer_id")
                        
                        split_results.append({
                            "user_id": participant.user_id,
                            "amount_cents": amount_to_charge,
                            "percentage": f"{participant.percentage * 100:.1f}%",
                            "status": "charged",
                            "transfer_id": result.get("transfer_id")
                        })
                        logger.info(f"[Webhook] Charged {participant.user_id}: ${amount_to_charge/100:.2f}")
                    else:
                        participant.status = "failed"
                        split_results.append({
                            "user_id": participant.user_id,
                            "amount_cents": amount_to_charge,
                            "status": "failed",
                            "reason": result.get("reason")
                        })
                        all_charged = False
                        logger.warning(f"[Webhook] Failed to charge {participant.user_id}: {result.get('reason')}")

                # Update split transaction
                split_txn.status = "completed" if all_charged else "partial"
                db.commit()
                db.close()

                return JSONResponse(content={
                    "status": "multi_person_split_executed",
                    "split_id": split_txn.id,
                    "total_cents": amount,
                    "merchant": merchant,
                    "all_charged": all_charged,
                    "splits": split_results
                })

            # ── SINGLE-USER SPLIT HANDLER (ORIGINAL) ──────────────────────────
            else:
                from models.virtual_card import SplitPreference
                
                splits = db.query(SplitPreference).filter(
                    SplitPreference.stripe_card_id == card_id,
                    SplitPreference.is_active == True
                ).all()
                db.close()

                if not splits:
                    logger.warning(f"[Webhook] No splits for card {card_id}")
                    return JSONResponse(content={"status": "no_splits_configured"})

                split_results = []
                for split in splits:
                    split_amount_cents = int(amount * split.percentage)

                    if not split.plaid_access_token or not split.plaid_account_id:
                        logger.warning(f"[Webhook] No Plaid token for {split.card_name} — logging only")
                        split_results.append({
                            "card": split.card_name,
                            "amount_cents": split_amount_cents,
                            "status": "plaid_not_linked",
                        })
                        continue

                    result = await charge_real_card_via_plaid(
                        access_token=split.plaid_access_token,
                        account_id=split.plaid_account_id,
                        amount_cents=split_amount_cents,
                        description=f"PaySplit-{merchant[:10]}",
                    )

                    split_results.append({
                        "card": split.card_name,
                        "amount_cents": split_amount_cents,
                        "percentage": split.percentage,
                        **result,
                    })

                logger.info(f"[Webhook] Splits: {split_results}")
                return JSONResponse(content={
                    "status": "splits_executed",
                    "total_cents": amount,
                    "merchant": merchant,
                    "splits": split_results,
                })

        except Exception as e:
            logger.error(f"[Webhook] Error processing split: {e}", exc_info=True)
            return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

    if event_type == "issuing_transaction.created":
        txn = event["data"]["object"]
        amount = abs(txn["amount"])
        merchant = txn["merchant_data"]["name"]
        logger.info(f"[Webhook] Transaction settled: ${amount/100:.2f} at {merchant}")
        return JSONResponse(content={"status": "transaction_logged"})

    return JSONResponse(content={"status": "ignored", "type": event_type})


# ── Save split preferences to DB ──────────────────────────────────────────────
@router.post("/register-splits")
async def register_splits(request: Request):
    # Verify the caller is authenticated via Bearer token.
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    from routes.auth import decode_token
    from models.user import User
    token = authorization.split(" ")[1]
    decode_token(token)  # raises 401 if expired or invalid

    data = await request.json()
    card_id = data.get("card_id")
    splits = data.get("splits", [])

    try:
        from models.virtual_card import SplitPreference
        db = get_db_session()

        # Delete existing splits for this card
        db.query(SplitPreference).filter(
            SplitPreference.stripe_card_id == card_id
        ).delete()

        # Insert new splits
        for split in splits:
            sp = SplitPreference(
                stripe_card_id=card_id,
                card_id=split["card_id"],
                card_name=split["card_name"],
                percentage=split["percentage"],
                plaid_access_token=split.get("plaid_access_token"),
                plaid_account_id=split.get("plaid_account_id"),
            )
            db.add(sp)

        db.commit()
        db.close()
        logger.info(f"[Webhook] Saved splits for {card_id} to DB")
        return {"status": "saved", "card_id": card_id, "count": len(splits)}

    except Exception as e:
        logger.error(f"[Webhook] DB save error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Test split simulation ─────────────────────────────────────────────────────
@router.post("/test-split")
async def test_split(request: Request):
    data = await request.json()
    card_id = data.get("card_id")
    amount = data.get("amount_cents", 5000)
    merchant = data.get("merchant", "Test Merchant")

    try:
        from models.virtual_card import SplitPreference
        db = get_db_session()
        splits = db.query(SplitPreference).filter(
            SplitPreference.stripe_card_id == card_id,
            SplitPreference.is_active == True
        ).all()
        db.close()
    except Exception as e:
        return {"error": str(e)}

    if not splits:
        return {"error": f"No splits configured for card {card_id}"}

    simulation = []
    for split in splits:
        split_amount = int(amount * split.percentage)
        simulation.append({
            "card": split.card_name,
            "percentage": f"{split.percentage*100:.0f}%",
            "amount": f"${split_amount/100:.2f}",
            "amount_cents": split_amount,
            "plaid_linked": bool(split.plaid_access_token and split.plaid_account_id),
        })

    return {
        "simulation": True,
        "total": f"${amount/100:.2f}",
        "merchant": merchant,
        "splits": simulation,
    }