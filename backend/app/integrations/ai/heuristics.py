"""Analyse déterministe d'une transcription (fournisseur « démo »).

Ce n'est PAS de l'IA : ce sont des règles simples, utiles pour développer et tester tout le parcours
Speaking sans clé d'API. Elles sont volontairement conservatrices et honnêtes sur leurs limites
(la prononciation n'est pas évaluée). À remplacer par un vrai fournisseur sans toucher au reste.
"""

import re

MAX_PLAUSIBLE_WPM = 250  # au-delà, personne ne parle : la transcription est probablement saisie
FILLERS = {"uh", "um", "er", "erm", "hmm", "uhm", "ah"}
CONNECTORS = {"because", "but", "and", "so", "however", "also", "then", "although", "when", "if"}
STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "for", "with", "is", "are", "am", "was",
    "were", "be", "you", "your", "i", "me", "my", "we", "it", "this", "that", "will", "can", "as", "about",
    "from", "by", "do", "does", "tell", "please", "what", "how", "why", "attending",
}

# (motif, remplacement affiché, explication) — erreurs fréquentes des francophones
GRAMMAR_RULES = [
    (r"\bI am agree\b", "I agree", "« agree » est un verbe : on ne dit pas « am agree »."),
    (r"\bI is\b", "I am", "Avec « I », on utilise « am »."),
    (r"\b(?:he|she|it) have\b", "has", "Avec he/she/it, le verbe « have » devient « has »."),
    (r"\b(?:he|she|it) don'?t\b", "doesn't", "Avec he/she/it, on utilise « doesn't »."),
    (r"\b(?:they|we|you) is\b", "are", "Avec they/we/you, on utilise « are »."),
    (r"\bmore better\b", "better", "« better » est déjà un comparatif."),
    (r"\bdiscuss about\b", "discuss", "« discuss » n'est pas suivi de « about »."),
    (r"\bmany (?:informations?|advices?)\b", "much information / advice", "« information » et « advice » sont indénombrables."),
    (r"\bI very like\b", "I like ... very much", "Placez « very much » après le verbe."),
    (r"\bmy name (?:are)\b", "my name is", "« name » est singulier : « is »."),
]


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


def _clamp(x: float) -> float:
    return max(0.0, min(100.0, x))


def grammar(text: str) -> dict:
    issues = []
    for pattern, fix, why in GRAMMAR_RULES:
        for m in re.finditer(pattern, text, flags=re.IGNORECASE):
            issues.append({"kind": "ERROR", "original": m.group(0), "suggestion": fix, "explanation": why})
    words = tokenize(text)
    if 0 < len(words) < 8:
        issues.append({"kind": "SUGGESTION", "explanation": "Essayez de répondre avec des phrases plus longues."})
    if len(words) >= 15 and not CONNECTORS.intersection(words):
        issues.append({
            "kind": "SUGGESTION",
            "explanation": "Reliez vos idées avec des mots comme « because », « but » ou « so ».",
        })
    if words.count("very") > 2:
        issues.append({"kind": "STYLE", "explanation": "« very » est répété : variez avec des adjectifs plus forts."})
    errors = sum(1 for i in issues if i["kind"] == "ERROR")
    score = _clamp(100 - 18 * errors) if words else 0.0
    note = f"{errors} erreur(s) détectée(s) par des règles simples." if errors else None
    return {"score": score, "issues": issues, "note": note}


def vocabulary(text: str) -> dict:
    words = [w for w in tokenize(text) if w not in FILLERS]
    if not words:
        return {"score": 0.0, "issues": [], "note": None}
    ttr = len(set(words)) / len(words)
    avg_len = sum(len(w) for w in words) / len(words)
    quantity = min(1.0, len(words) / 20)
    score = 100 * (0.6 * min(1.0, ttr / 0.7) + 0.4 * min(1.0, avg_len / 5.5)) * (0.5 + 0.5 * quantity)
    issues = []
    if len(words) >= 12 and ttr < 0.5:
        issues.append({"kind": "SUGGESTION", "explanation": "Vous répétez beaucoup les mêmes mots : variez votre vocabulaire."})
    return {"score": _clamp(score), "issues": issues, "note": None}


def fluency(text: str, duration_seconds: float | None) -> dict:
    words = tokenize(text)
    if not words:
        return {"score": 0.0, "issues": [], "note": None}
    fillers = sum(1 for w in words if w in FILLERS)
    length_score = min(1.0, len(words) / 25)
    pace_score = 1.0
    note = None
    if duration_seconds and duration_seconds >= 3:
        wpm = len(words) / (duration_seconds / 60)
        if wpm > MAX_PLAUSIBLE_WPM:
            # Texte saisi sans rapport avec la durée enregistrée : on ne juge pas le débit.
            note = "Débit non mesurable (la transcription ne correspond pas à la durée enregistrée)."
        else:
            pace_score = max(0.3, min(1.0, wpm / 90)) if wpm < 90 else (1.0 if wpm <= 170 else 0.8)
            note = f"Débit estimé : {round(wpm)} mots/minute."
    score = 100 * (0.6 * length_score + 0.4 * pace_score) - 8 * fillers
    issues = []
    if fillers >= 2:
        issues.append({"kind": "SUGGESTION", "explanation": f"{fillers} hésitations (« um », « uh »...) : une courte pause suffit."})
    return {"score": _clamp(score), "issues": issues, "note": note}


def relevance(text: str, scenario_text: str) -> dict:
    words = set(tokenize(text))
    keywords = {w for w in tokenize(scenario_text) if w not in STOPWORDS and len(w) > 3}
    if len(words) < 5:
        return {"score": 20.0, "issues": [], "note": "Réponse trop courte pour juger la pertinence."}
    matches = len(words & keywords)
    score = 30.0 if matches == 0 else min(100.0, 55 + 15 * matches)
    return {"score": score, "issues": [], "note": f"{matches} mot(s) en lien avec la situation."}


LABELS = {"grammar": "grammaire", "vocabulary": "vocabulaire", "fluency": "fluidité", "relevance": "pertinence"}


def analyze(text: str, scenario_text: str, duration_seconds: float | None = None) -> dict:
    dims = {
        "grammar": grammar(text),
        "vocabulary": vocabulary(text),
        "fluency": fluency(text, duration_seconds),
        "relevance": relevance(text, scenario_text),
        "pronunciation": {
            "score": None, "issues": [],
            "note": "Prononciation non évaluée en mode démo (nécessite un vrai moteur de reconnaissance vocale).",
        },
    }
    strengths = [f"Bonne {LABELS[k]}" for k, d in dims.items() if k in LABELS and (d["score"] or 0) >= 75]
    weakest = min((k for k in LABELS), key=lambda k: dims[k]["score"] or 0)
    tips = [f"Axe de travail prioritaire : la {LABELS[weakest]}."] if (dims[weakest]["score"] or 0) < 75 else []
    return {"strengths": strengths, "tips": tips, **dims}
