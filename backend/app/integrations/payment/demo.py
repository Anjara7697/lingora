"""Fournisseur de démonstration, sans clé ni argent réel : l'élève « paie » via une page de simulation.

Les notifications serveur sont signées en HMAC-SHA256 comme le feront les vrais fournisseurs.
"""

import hashlib
import hmac
import json
import uuid
from decimal import Decimal

from app.core.config import settings
from app.integrations.payment.base import Checkout, PaymentProviderError, WebhookEvent

SIGNATURE_HEADER = "x-lingora-signature"


def sign(body: bytes, secret: str | None = None) -> str:
    return hmac.new((secret or settings.payment_webhook_secret).encode(), body, hashlib.sha256).hexdigest()


class DemoPaymentProvider:
    name = "demo"

    def create_checkout(self, payment_id: uuid.UUID, amount: Decimal, currency: str, return_url: str) -> Checkout:
        return Checkout(
            transaction_id=f"demo_{uuid.uuid4().hex}",
            redirect_url=f"{settings.app_base_url}/billing/demo-checkout?payment={payment_id}",
        )

    def parse_webhook(self, headers: dict[str, str], body: bytes) -> WebhookEvent:
        received = headers.get(SIGNATURE_HEADER, "")
        if not hmac.compare_digest(received, sign(body)):
            raise PaymentProviderError("Signature invalide")
        try:
            data = json.loads(body)
            return WebhookEvent(str(data["transaction_id"]), data["status"] == "SUCCESS")
        except (ValueError, KeyError, TypeError):
            raise PaymentProviderError("Notification illisible") from None
