import pytest

from app.integrations.ai import AIProviderError, get_analyzer, get_stt, normalize
from app.integrations.ai import heuristics as h
from app.integrations.storage import LocalStorage

SCENARIO = "You are attending a job interview for a junior developer position. Tell me about yourself."
GOOD = (
    "Hello, my name is Anjara and I am a junior developer. I studied computer science because I love "
    "solving problems, and I have built several web projects. I would like to join your company so I "
    "can learn from experienced developers."
)


def test_grammar_detects_typical_french_speaker_errors():
    out = h.grammar("I am agree with this idea and she have a car")
    originals = {i["original"].lower() for i in out["issues"] if i["kind"] == "ERROR"}
    assert originals == {"i am agree", "she have"}
    assert out["score"] == 100 - 36


def test_suggestions_are_not_counted_as_errors():
    out = h.grammar("Yes it is fine")  # trop court : simple suggestion
    assert [i["kind"] for i in out["issues"]] == ["SUGGESTION"] and out["score"] == 100


def test_good_answer_scores_well_and_pronunciation_is_not_evaluated():
    raw = h.analyze(GOOD, SCENARIO, duration_seconds=30)
    result = normalize(raw)
    assert result.grammar.score == 100 and result.relevance.score >= 70
    assert result.pronunciation.score is None and "démo" in result.pronunciation.note
    assert result.overall_score is not None and result.overall_score > 70
    assert "Bonne grammaire" in result.strengths


def test_empty_and_filler_only_answers_do_not_crash():
    for text in ["", "uh um er"]:
        res = normalize(h.analyze(text, SCENARIO, 5))
        assert res.fluency.score is not None and res.fluency.score <= 20


def test_fluency_penalises_fillers_and_slow_pace():
    fast = h.fluency(GOOD, 30)["score"]
    slow = h.fluency(GOOD, 300)["score"]
    um = h.fluency("um " + GOOD + " uh um", 30)["score"]
    assert slow < fast and um < fast


def test_normalize_clamps_scores_and_rejects_garbage():
    raw = h.analyze(GOOD, SCENARIO)
    raw["grammar"]["score"] = 250
    assert normalize(raw).grammar.score == 100.0
    with pytest.raises(AIProviderError):
        normalize({"grammar": "nope"})
    bad = h.analyze(GOOD, SCENARIO)
    bad["grammar"]["issues"] = [{"kind": "CERTAIN_ERROR", "explanation": "x"}]
    with pytest.raises(AIProviderError):
        normalize(bad)


def test_demo_stt_requires_a_client_transcript():
    stt = get_stt()
    with pytest.raises(AIProviderError):
        stt.transcribe(b"audio", "audio/webm", hint_text="  ")
    t = stt.transcribe(b"audio", "audio/webm", hint_text="Hello there")
    assert t.text == "Hello there" and t.simulated is True


def test_unknown_provider_is_an_error(monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "ai_provider", "nope")
    with pytest.raises(AIProviderError):
        get_analyzer()


def test_local_storage_roundtrip_and_path_traversal(tmp_path):
    s = LocalStorage(str(tmp_path))
    s.put("speaking/2026/10/a.webm", b"abc")
    assert s.get("speaking/2026/10/a.webm") == b"abc"
    s.delete("speaking/2026/10/a.webm")
    with pytest.raises(FileNotFoundError):
        s.get("speaking/2026/10/a.webm")
    for evil in ["../x", "/etc/passwd", "a/../../x"]:
        with pytest.raises(ValueError):
            s.put(evil, b"x")


def test_implausible_pace_is_not_judged():
    typed_fast = h.fluency(GOOD, 4)  # ~40 mots « dits » en 4 secondes : texte saisi
    assert "non mesurable" in typed_fast["note"]
    assert typed_fast["score"] == 100.0  # débit ignoré : seule la quantité de parole compte
