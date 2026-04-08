from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
import stripe

from db import get_db
from config import settings
from models.payment import Payment
from models.user import User
from routes.auth import get_current_user

# Set Stripe API key once at module load, not per-request.
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/api/payments", tags=["Payments"])


class CheckoutRequest(BaseModel):
    from_user: str
    to_user: str
    amount_cents: int = Field(gt=0)
    currency: str = "usd"
    group_id: Optional[str] = None
    settlement_ref: Optional[str] = None


class CheckoutResponse(BaseModel):
    url: str
    session_id: str
    payment_id: str


# ── Single payment (unchanged) ─────────────────────────────────────────────────
@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout_session(payload: CheckoutRequest, db: Session = Depends(get_db)):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY not set in .env")

    try:
        payment = Payment(
            from_user=payload.from_user,
            to_user=payload.to_user,
            amount_cents=payload.amount_cents,
            currency=payload.currency,
            status="pending",
            group_id=payload.group_id,
            settlement_ref=payload.settlement_ref,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

        success_url = f"{settings.FRONTEND_URL}/payment/success?payment_id={payment.id}"
        cancel_url  = f"{settings.FRONTEND_URL}/payment/cancel?payment_id={payment.id}"

        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": payload.currency,
                    "product_data": {
                        "name": f"Settlement payment to {payload.to_user}",
                        "description": f"From {payload.from_user} to {payload.to_user}",
                    },
                    "unit_amount": payload.amount_cents,
                },
                "quantity": 1,
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "payment_id": payment.id,
                "from_user": payload.from_user,
                "to_user": payload.to_user,
                "group_id": payload.group_id or "",
                "settlement_ref": payload.settlement_ref or "",
            },
        )

        payment.stripe_session_id = session.id
        db.commit()

        return CheckoutResponse(url=session.url, session_id=session.id, payment_id=payment.id)

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── NEW: Split payment across two cards ────────────────────────────────────────
class SplitCardItem(BaseModel):
    card_name: str
    amount_cents: int = Field(gt=0)


class SplitCheckoutRequest(BaseModel):
    from_user: str
    to_user: str          # merchant
    currency: str = "usd"
    group_id: Optional[str] = None
    cards: list[SplitCardItem]   # exactly 2 items expected


class SplitCheckoutResponse(BaseModel):
    url: str              # URL of the FIRST Stripe session (chain starts here)
    payment_ids: list[str]


@router.post("/checkout-split", response_model=SplitCheckoutResponse)
def create_split_checkout(payload: SplitCheckoutRequest, db: Session = Depends(get_db)):
    """
    Creates N chained Stripe checkout sessions (one per card).
    User pays session 1 → success_url redirects to session 2 → ... → final success page.
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY not set in .env")
    if len(payload.cards) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 cards for a split")

    try:
        # 1) Create all Payment DB records first so we have their IDs
        payments = []
        for card in payload.cards:
            p = Payment(
                from_user=payload.from_user,
                to_user=payload.to_user,
                amount_cents=card.amount_cents,
                currency=payload.currency,
                status="pending",
                group_id=payload.group_id,
                settlement_ref=f"split:{card.card_name}",
            )
            db.add(p)
            db.commit()
            db.refresh(p)
            payments.append((p, card))

        # 2) Build sessions in REVERSE so each session's success_url
        #    points to the next session's URL.
        #    Last session → /payment/success
        #    Second-to-last → Stripe URL of last session
        #    etc.

        session_urls = []  # built back-to-front
        final_success = f"{settings.FRONTEND_URL}/payment/success"

        for i in reversed(range(len(payments))):
            p, card = payments[i]

            # success_url: either the next Stripe session or the final success page
            if i == len(payments) - 1:
                # last card in chain → go to final success page
                success_url = f"{final_success}?payment_id={p.id}"
            else:
                # point to the Stripe URL of the already-created next session
                success_url = session_urls[-1]  # most recently created = next in chain

            cancel_url = f"{settings.FRONTEND_URL}/payment/cancel?payment_id={p.id}"

            session = stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": payload.currency,
                        "product_data": {
                            "name": f"Split payment to {payload.to_user} via {card.card_name}",
                            "description": f"Card {i+1} of {len(payments)} — {card.card_name}",
                        },
                        "unit_amount": card.amount_cents,
                    },
                    "quantity": 1,
                }],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "payment_id": p.id,
                    "from_user": payload.from_user,
                    "to_user": payload.to_user,
                    "card_name": card.card_name,
                    "split_index": str(i),
                    "group_id": payload.group_id or "",
                },
            )

            p.stripe_session_id = session.id
            db.commit()

            session_urls.append(session.url)

        # session_urls is reversed (last card first), so the first session URL is last
        first_session_url = session_urls[-1]
        payment_ids = [str(p.id) for p, _ in payments]

        return SplitCheckoutResponse(url=first_session_url, payment_ids=payment_ids)

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Webhook ────────────────────────────────────────────────────────────────────
@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET not set in .env")

    stripe.api_key = settings.STRIPE_SECRET_KEY
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig_header, secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session  = event["data"]["object"]
        metadata = session.get("metadata") or {}
        payment_id = metadata.get("payment_id")
        if payment_id:
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            if payment and payment.status != "paid":
                payment.status = "paid"
                payment.stripe_session_id = session.get("id")
                db.commit()

    return {"received": True}


class ConfirmRequest(BaseModel):
    payment_id: str


@router.post("/confirm")
def confirm_payment_demo(
    req: ConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm a pending payment (authenticated). Only the originating user may confirm."""
    payment = db.query(Payment).filter(Payment.id == req.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.from_user != str(current_user.id) and payment.from_user != current_user.email:
        raise HTTPException(status_code=403, detail="Not authorised to confirm this payment")
    payment.status = "paid"
    db.commit()
    return {"ok": True, "payment_id": payment.id, "status": payment.status}


@router.get("/{payment_id}")
def get_payment(payment_id: str, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {
        "id": payment.id,
        "from_user": payment.from_user,
        "to_user": payment.to_user,
        "amount_cents": payment.amount_cents,
        "currency": payment.currency,
        "status": payment.status,
        "stripe_session_id": payment.stripe_session_id,
        "group_id": payment.group_id,
        "settlement_ref": payment.settlement_ref,
    }