"""Interfaces des fournisseurs IA (STT / analyse). Le domaine Speaking ne connaît que celles-ci."""

from dataclasses import dataclass, field
from typing import Protocol


class AIProviderError(Exception):
    """Échec d'un fournisseur (timeout, indisponibilité, réponse invalide...)."""


class TranscriptRequired(AIProviderError):
    """Le fournisseur n'a pas de STT et attend une transcription du client (mode démo)."""


@dataclass
class Transcript:
    text: str
    language: str = "en"
    confidence: float | None = None
    model: str | None = None
    simulated: bool = False  # True : transcription fournie par le client (mode démo), pas par un STT
    raw: dict = field(default_factory=dict)


class SpeechToText(Protocol):
    name: str
    model: str

    def transcribe(
        self, audio: bytes, mime_type: str, *, hint_text: str | None = None, language: str = "en"
    ) -> Transcript: ...


class SpeakingAnalyzer(Protocol):
    name: str
    model: str

    def analyze(
        self, transcript: str, *, scenario_text: str, duration_seconds: float | None = None
    ) -> dict:
        """Retourne la sortie BRUTE du fournisseur ; elle est validée par `normalize` avant usage."""
