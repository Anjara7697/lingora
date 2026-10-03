from app.integrations.payment.base import (
    Checkout,
    PaymentProvider,
    PaymentProviderError,
    WebhookEvent,
)
from app.integrations.payment.demo import DemoPaymentProvider

__all__ = ["Checkout", "PaymentProvider", "PaymentProviderError", "WebhookEvent", "get_provider"]

_REGISTRY = {"demo": DemoPaymentProvider}  # MVola, Orange Money, Airtel Money, Stripe… s'ajoutent ici


def get_provider(name: str | None = None) -> PaymentProvider:
    from app.core.config import settings

    name = name or settings.payment_provider
    try:
        return _REGISTRY[name]()
    except KeyError:
        raise PaymentProviderError(f"Fournisseur de paiement inconnu : {name}") from None
