"""Estimation du niveau CECRL à partir des réponses (fonctions pures).

Règle (déterministe, MVP) : on parcourt les niveaux testés du plus bas au plus haut ;
un niveau est « validé » si au moins 50 % de ses questions sont réussies. On s'arrête au premier
niveau non validé. Le niveau estimé est le dernier niveau validé (A1 minimum).
"""

from collections import defaultdict

from app.modules.learning.models import CefrLevel

ORDER = [CefrLevel.A1, CefrLevel.A2, CefrLevel.B1, CefrLevel.B2, CefrLevel.C1, CefrLevel.C2]
PASS_RATIO = 0.5


def estimate_level(results: list[tuple[CefrLevel, bool]]) -> CefrLevel:
    by_level: dict[CefrLevel, list[bool]] = defaultdict(list)
    for level, ok in results:
        by_level[level].append(ok)
    reached = CefrLevel.A1
    for level in ORDER:
        if level not in by_level:
            continue
        outcomes = by_level[level]
        if sum(outcomes) / len(outcomes) >= PASS_RATIO:
            reached = level
        else:
            break
    return reached


def percentage(results: list[tuple[CefrLevel, bool]]) -> float:
    return round(100 * sum(ok for _, ok in results) / len(results), 2) if results else 0.0
