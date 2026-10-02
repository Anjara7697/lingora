"""Correction automatique des activités (fonctions pures, sans base de données).

Format de `activity.configuration` par type :
- MCQ / LISTENING / READING : {question, options: [str], correct_answer: int}
- TRUE_FALSE : {question, correct_answer: bool}
- FILL_BLANK / TRANSLATION : {question, correct_answers: [str]}
- ORDERING : {question, items: [str] (mélangés), correct_order: [str]}
- MATCHING : {question, pairs: [{left, right}]}
- OPEN_QUESTION / WRITING / SPEAKING : {question|prompt, ...} — non corrigés automatiquement.

La réponse de l'étudiant (`answer`) suit : int | bool | str | list[str] | dict[str, str].
"""

import random
import re
from dataclasses import dataclass
from typing import Any

from app.modules.learning.models import ActivityType

MCQ_LIKE = {ActivityType.MCQ, ActivityType.LISTENING, ActivityType.READING}
TEXT_LIKE = {ActivityType.FILL_BLANK, ActivityType.TRANSLATION}
SECRET_KEYS = {"correct_answer", "correct_answers", "correct_order", "explanation", "cefr", "skill"}


@dataclass
class GradeResult:
    graded: bool  # False : activité non corrigée automatiquement (oral, rédaction libre...)
    is_correct: bool | None
    correct_answer: Any = None


def is_auto_graded(activity_type: ActivityType, config: dict) -> bool:
    if activity_type in MCQ_LIKE:
        return "correct_answer" in config and "options" in config
    if activity_type == ActivityType.TRUE_FALSE:
        return "correct_answer" in config
    if activity_type in TEXT_LIKE:
        return bool(config.get("correct_answers"))
    if activity_type == ActivityType.ORDERING:
        return bool(config.get("correct_order"))
    if activity_type == ActivityType.MATCHING:
        return bool(config.get("pairs"))
    return False


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[.!?,;]+$", "", str(text).strip())).casefold()


def grade(activity_type: ActivityType, config: dict | None, answer: Any) -> GradeResult:
    config = config or {}
    if not is_auto_graded(activity_type, config):
        return GradeResult(graded=False, is_correct=None)

    if activity_type in MCQ_LIKE:
        expected = config["correct_answer"]
        ok = isinstance(answer, int) and not isinstance(answer, bool) and answer == expected
        return GradeResult(True, ok, config["options"][expected])

    if activity_type == ActivityType.TRUE_FALSE:
        expected = config["correct_answer"]
        return GradeResult(True, isinstance(answer, bool) and answer == expected, expected)

    if activity_type in TEXT_LIKE:
        accepted = [_norm(a) for a in config["correct_answers"]]
        ok = isinstance(answer, str) and _norm(answer) in accepted
        return GradeResult(True, ok, config["correct_answers"][0])

    if activity_type == ActivityType.ORDERING:
        expected = config["correct_order"]
        ok = isinstance(answer, list) and [_norm(a) for a in answer] == [_norm(e) for e in expected]
        return GradeResult(True, ok, expected)

    # MATCHING
    expected = {p["left"]: p["right"] for p in config["pairs"]}
    ok = (
        isinstance(answer, dict)
        and set(answer) == set(expected)
        and all(_norm(answer[k]) == _norm(v) for k, v in expected.items())
    )
    return GradeResult(True, ok, expected)


def public_config(activity_type: ActivityType, config: dict | None, seed: str = "") -> dict:
    """Configuration sans les solutions, sûre à envoyer au navigateur."""
    config = config or {}
    public = {k: v for k, v in config.items() if k not in SECRET_KEYS}
    if activity_type == ActivityType.MATCHING and "pairs" in config:
        public.pop("pairs")
        rights = [p["right"] for p in config["pairs"]]
        random.Random(seed).shuffle(rights)  # ordre stable pour une activité donnée
        public["lefts"] = [p["left"] for p in config["pairs"]]
        public["rights"] = rights
    return public
