"""Envoi d'emails derrière une interface : console (développement) ou SMTP."""

import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger("lingora.email")


class EmailSender(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class ConsoleEmailSender:
    """Développement : écrit le message dans les logs (le lien de réinitialisation y est lisible)."""

    def send(self, to: str, subject: str, body: str) -> None:
        logger.info("EMAIL (console) to=%s subject=%s\n%s", to, subject, body)


class SmtpEmailSender:
    def send(self, to: str, subject: str, body: str) -> None:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = settings.email_from, to, subject
        msg.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_starttls:
                smtp.starttls(context=ssl.create_default_context())
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)


def get_email_sender() -> EmailSender:
    return SmtpEmailSender() if settings.email_backend == "smtp" else ConsoleEmailSender()


def send_email_safely(to: str, subject: str, body: str) -> None:
    """Ne propage jamais d'erreur : un échec d'envoi ne doit ni casser la requête ni révéler si le compte existe."""
    try:
        get_email_sender().send(to, subject, body)
    except Exception:
        logger.exception("Échec d'envoi d'email (destinataire masqué dans le message d'erreur)")
