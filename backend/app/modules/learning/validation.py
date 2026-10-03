"""Validation et normalisation de `activity.configuration` à l'écriture (CMS).

Un exercice mal formé (QCM sans bonne réponse, remise en ordre incohérente...) ne doit jamais atteindre
un élève. Fonctions pures : `validate_activity` retourne la configuration nettoyée ou lève ConfigInvalid.
Les clés inconnues sont supprimées ; les formats sont ceux décrits dans `grading.py`.
"""

import random
from collections import Counter
from typing import Any

from app.modules.learning.models import ActivityType

MAX_TEXT = 500
MCQ_LIKE = {ActivityType.MCQ, ActivityType.LISTENING, ActivityType.READING}
TEXT_ANSWER = {ActivityType.FILL_BLANK, ActivityType.TRANSLATION}
FREE_TEXT = {ActivityType.SPEAKING, ActivityType.OPEN_QUESTION, ActivityType.WRITING}
BLANK = "___"


class ConfigInvalid(Exception):
    def __init__(self, errors: list[str]):
        super().__init__("; ".join(errors))
        self.errors = errors


def _text(cfg: dict, key: str, errors: list[str], label: str, required: bool = True) -> str | None:
    value = cfg.get(key)
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            errors.append(f"{label} : champ obligatoire.")
        return None
    if not isinstance(value, str):
        errors.append(f"{label} : doit être un texte.")
        return None
    value = value.strip()
    if len(value) > MAX_TEXT:
        errors.append(f"{label} : {MAX_TEXT} caractères maximum.")
    return value


def _str_list(value: Any, lo: int, hi: int, errors: list[str], label: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(x, str) and x.strip() for x in value):
        errors.append(f"{label} : liste de textes non vides requise.")
        return []
    items = [x.strip() for x in value]
    if not lo <= len(items) <= hi:
        errors.append(f"{label} : entre {lo} et {hi} éléments.")
    return items


def _shuffled(items: list[str], seed: str) -> list[str]:
    """Mélange déterministe, garanti différent de l'ordre correct quand c'est possible."""
    rng = random.Random(seed)
    out = list(items)
    for _ in range(20):
        rng.shuffle(out)
        if out != items or len(set(items)) < 2:
            break
    return out


def validate_activity(activity_type: ActivityType, raw: Any) -> dict:
    if not isinstance(raw, dict):
        raise ConfigInvalid(["La configuration doit être un objet."])
    errors: list[str] = []
    out: dict[str, Any] = {}
    explanation = _text(raw, "explanation", errors, "Explication", required=False)

    if activity_type in MCQ_LIKE:
        out["question"] = _text(raw, "question", errors, "Question")
        options = _str_list(raw.get("options"), 2, 6, errors, "Options")
        if len({o.casefold() for o in options}) != len(options):
            errors.append("Options : les propositions doivent être toutes différentes.")
        answer = raw.get("correct_answer")
        if isinstance(answer, bool) or not isinstance(answer, int) or not 0 <= answer < max(len(options), 1):
            errors.append("Bonne réponse : indiquez la position d'une des options.")
        out.update(options=options, correct_answer=answer)

    elif activity_type == ActivityType.TRUE_FALSE:
        out["question"] = _text(raw, "question", errors, "Affirmation")
        if not isinstance(raw.get("correct_answer"), bool):
            errors.append("Bonne réponse : choisissez Vrai ou Faux.")
        out["correct_answer"] = raw.get("correct_answer")

    elif activity_type in TEXT_ANSWER:
        question = _text(raw, "question", errors, "Question")
        if activity_type == ActivityType.FILL_BLANK and question and BLANK not in question:
            errors.append(f"Question : la phrase doit contenir {BLANK} à l'endroit du mot à compléter.")
        out["question"] = question
        out["correct_answers"] = _str_list(raw.get("correct_answers"), 1, 10, errors, "Réponses acceptées")

    elif activity_type == ActivityType.ORDERING:
        out["question"] = _text(raw, "question", errors, "Consigne", required=False) or "Make a sentence."
        order = _str_list(raw.get("correct_order"), 2, 10, errors, "Ordre correct")
        out["correct_order"] = order
        if "items" in raw:  # si fourni, doit contenir exactement les mêmes éléments
            given = _str_list(raw.get("items"), 2, 10, errors, "Éléments")
            if Counter(x.casefold() for x in given) != Counter(x.casefold() for x in order):
                errors.append("Éléments : doivent être exactement les mots de l'ordre correct.")
            out["items"] = given
        else:
            out["items"] = _shuffled(order, "|".join(order))

    elif activity_type == ActivityType.MATCHING:
        out["question"] = _text(raw, "question", errors, "Consigne", required=False) or "Match the words."
        pairs = raw.get("pairs")
        clean: list[dict[str, str]] = []
        if not isinstance(pairs, list) or not 2 <= len(pairs) <= 8:
            errors.append("Paires : entre 2 et 8 paires requises.")
        else:
            for p in pairs:
                left, right = (p.get("left"), p.get("right")) if isinstance(p, dict) else (None, None)
                if not (isinstance(left, str) and left.strip() and isinstance(right, str) and right.strip()):
                    errors.append("Paires : chaque paire a un élément gauche et droit non vides.")
                    break
                clean.append({"left": left.strip(), "right": right.strip()})
            lefts = [p["left"].casefold() for p in clean]
            rights = [p["right"].casefold() for p in clean]
            if len(set(lefts)) != len(lefts) or len(set(rights)) != len(rights):
                errors.append("Paires : les éléments de gauche (et de droite) doivent être tous différents.")
        out["pairs"] = clean

    elif activity_type in FREE_TEXT:
        out["prompt"] = _text(raw, "prompt", errors, "Consigne")
        example = _text(raw, "example", errors, "Exemple", required=False)
        if example:
            out["example"] = example

    else:  # pragma: no cover - garde si un type est ajouté à l'enum sans validateur
        errors.append(f"Type d'activité non pris en charge : {activity_type.value}")

    if explanation and activity_type not in FREE_TEXT:
        out["explanation"] = explanation
    if errors:
        raise ConfigInvalid(errors)
    return out
