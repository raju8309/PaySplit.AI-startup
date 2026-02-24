from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
import stripe

from db import get_db
from config import settings
from models.payment import Payment

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


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout_session(payload: CheckoutRequest, db: Session = Depends(get_db)):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY not set in .env")

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        # 1) Create local payment record (pending)
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

        # 2) Create Stripe Checkout Session
        success_url = f"{settings.FRONTEND_URL}/payment/success?payment_id={payment.id}"
        cancel_url = f"{settings.FRONTEND_URL}/payment/cancel?payment_id={payment.id}"

        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": payload.currency,
                        "product_data": {
                            "name": f"Settlement payment to {payload.to_user}",
                            "description": f"From {payload.from_user} to {payload.to_user}",
                        },
                        "unit_amount": payload.amount_cents,
                    },
                    "quantity": 1,
                }
            ],
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

        # 3) Save Stripe session id
        payment.stripe_session_id = session.id
        db.commit()

        return CheckoutResponse(url=session.url, session_id=session.id, payment_id=payment.id)

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY not set in .env")
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET not set in .env")

    stripe.api_key = settings.STRIPE_SECRET_KEY

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # When payment completes successfully
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata") or {}
        payment_id = metadata.get("payment_id")

        if payment_id:
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            if payment and payment.status != "paid":
                payment.status = "paid"
                payment.stripe_session_id = session.get("id")
                db.commit()

    return {"received": True}


# DEMO fallback (if webhook not set up yet)
class ConfirmRequest(BaseModel):
    payment_id: str


@router.post("/confirm")
def confirm_payment_demo(req: ConfirmRequest, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == req.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

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