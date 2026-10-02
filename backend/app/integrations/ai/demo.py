"""Fournisseur « démo » : aucune clé d'API, aucun appel réseau. Voir heuristics.py pour ses limites."""

from app.integrations.ai import heuristics
from app.integrations.ai.base import Transcript, TranscriptRequired


class DemoSTT:
    name = "demo"
    model = "client-transcript"

    def transcribe(self, audio, mime_type, *, hint_text=None, language="en") -> Transcript:
        # Pas de vrai STT : on exige la transcription du client (reconnaissance vocale du navigateur,
        # ou texte saisi). Elle est marquée « simulated » pour que rien ne la fasse passer pour du STT.
        text = (hint_text or "").strip()
        if not text:
            raise TranscriptRequired("Transcription requise en mode démo")
        return Transcript(text=text, language=language, model=self.model, simulated=True,
                          raw={"source": "client-hint", "audio_bytes": len(audio), "mime_type": mime_type})


class DemoAnalyzer:
    name = "demo"
    model = "heuristics-v1"

    def analyze(self, transcript, *, scenario_text, duration_seconds=None) -> dict:
        return heuristics.analyze(transcript, scenario_text, duration_seconds)
