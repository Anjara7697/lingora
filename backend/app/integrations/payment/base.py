"""Contrat d'un fournisseur de paiement (Mobile Money, carte…). Le code métier ne connaît que cette interface."""

import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


class PaymentProviderError(Exception):
    """Fournisseur inconnu, notification invalide ou signature incorrecte."""


@dataclass(frozen=True)
class Checkout:
    transaction_id: str  # identifiant de la transaction chez le fournisseur (clé d'idempotence)
    redirect_url: str  # où envoyer l'élève pour payer


@dataclass(frozen=True)
class WebhookEvent:
    transaction_id: str
    success: bool


class PaymentProvider(Protocol):
    name: str

    def create_checkout(self, payment_id: uuid.UUID, amount: Decimal, currency: str, return_url: str) -> Checkout: ...

    def parse_webhook(self, headers: dict[str, str], body: bytes) -> WebhookEvent:
        """Vérifie l'authenticité de la notification puis l'interprète ; lève PaymentProviderError sinon."""
