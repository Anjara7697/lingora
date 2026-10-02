from app.integrations.ai.base import (
    AIProviderError,
    SpeakingAnalyzer,
    SpeechToText,
    Transcript,
    TranscriptRequired,
)
from app.integrations.ai.demo import DemoAnalyzer, DemoSTT
from app.integrations.ai.schemas import AnalysisResult, normalize

__all__ = [
    "AIProviderError",
    "AnalysisResult",
    "SpeakingAnalyzer",
    "SpeechToText",
    "Transcript",
    "TranscriptRequired",
    "get_analyzer",
    "get_stt",
    "normalize",
]

_REGISTRY = {"demo": (DemoSTT, DemoAnalyzer)}  # d'autres fournisseurs s'ajoutent ici


def _provider(index: int):
    from app.core.config import settings

    try:
        return _REGISTRY[settings.ai_provider][index]()
    except KeyError:
        raise AIProviderError(f"Fournisseur IA inconnu : {settings.ai_provider}") from None


def get_stt() -> SpeechToText:
    return _provider(0)


def get_analyzer() -> SpeakingAnalyzer:
    return _provider(1)
