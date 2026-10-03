import uuid

from fastapi import APIRouter, Request

from app.modules.commerce import schemas as s
from app.modules.commerce import service
from app.shared.dependencies import CurrentUser, DbSession
from app.shared.errors import envelope

router = APIRouter(prefix="/billing", tags=["billing"])


def _status(data: dict) -> dict:
    return envelope(s.BillingStatus.model_validate(data).model_dump(mode="json"))


@router.get("/plans")
def plans(db: DbSession):
    return envelope([s.PlanOut.model_validate(p).model_dump(mode="json") for p in service.list_plans(db)])


@router.get("/me")
def my_status(db: DbSession, user: CurrentUser):
    return _status(service.status_view(db, user))


@router.post("/trial")
def start_trial(db: DbSession, user: CurrentUser):
    return _status(service.start_trial(db, user))


@router.post("/checkout", status_code=201)
def checkout(body: s.CheckoutIn, db: DbSession, user: CurrentUser):
    return envelope(s.CheckoutOut.model_validate(service.checkout(db, user, body.plan_slug)).model_dump(mode="json"))


@router.post("/payments/{payment_id}/demo-confirm")
def demo_confirm(payment_id: uuid.UUID, body: s.DemoConfirmIn, db: DbSession, user: CurrentUser):
    return _status(service.demo_confirm(db, user, payment_id, body.success))


@router.get("/payments")
def payments(db: DbSession, user: CurrentUser):
    return envelope([s.PaymentOut.from_payment(p).model_dump(mode="json") for p in service.list_payments(db, user)])


@router.post("/cancel")
def cancel(db: DbSession, user: CurrentUser):
    return _status(service.cancel(db, user))


@router.post("/webhooks/{provider}")
async def webhook(provider: str, request: Request, db: DbSession):
    """Notification serveur du fournisseur : authentifiée par signature, jamais par jeton utilisateur."""
    service.handle_webhook(db, provider, {k.lower(): v for k, v in request.headers.items()}, await request.body())
    return envelope({"received": True})
