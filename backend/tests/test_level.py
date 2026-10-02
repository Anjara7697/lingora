from app.modules.assessment.level import estimate_level, percentage
from app.modules.learning.models import CefrLevel as L

TWO_PER_LEVEL = [L.A1, L.A1, L.A2, L.A2, L.B1, L.B1, L.B2, L.B2, L.C1, L.C1]


def results(*passed_per_level: int):
    out = []
    for i, passed in enumerate(passed_per_level):
        out += [(TWO_PER_LEVEL[2 * i], True)] * passed + [(TWO_PER_LEVEL[2 * i], False)] * (2 - passed)
    return out


def test_everything_right_reaches_top_tested_level():
    assert estimate_level(results(2, 2, 2, 2, 2)) == L.C1


def test_everything_wrong_is_a1():
    assert estimate_level(results(0, 0, 0, 0, 0)) == L.A1


def test_stops_at_first_failed_level_even_if_higher_ones_are_lucky():
    assert estimate_level(results(2, 2, 0, 2, 2)) == L.A2


def test_half_correct_validates_a_level():
    assert estimate_level(results(2, 1, 1, 0, 2)) == L.B1


def test_untested_levels_are_skipped():
    assert estimate_level([(L.A2, True), (L.B1, True), (L.B1, False), (L.B2, False)]) == L.B1


def test_empty_is_a1_and_percentage():
    assert estimate_level([]) == L.A1
    assert percentage([]) == 0.0
    assert percentage([(L.A1, True), (L.A1, False), (L.A2, True)]) == 66.67
