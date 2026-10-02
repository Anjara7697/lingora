import pytest

from app.modules.learning.grading import grade, is_auto_graded, public_config
from app.modules.learning.models import ActivityType as T

MCQ = {"question": "I ___ a student", "options": ["am", "is", "are"], "correct_answer": 0}


@pytest.mark.parametrize(
    ("answer", "expected"), [(0, True), (1, False), ("0", False), (True, False), (None, False)]
)
def test_mcq(answer, expected):
    assert grade(T.MCQ, MCQ, answer).is_correct is expected


def test_true_false_requires_real_bool():
    cfg = {"question": "x", "correct_answer": True}
    assert grade(T.TRUE_FALSE, cfg, True).is_correct is True
    assert grade(T.TRUE_FALSE, cfg, False).is_correct is False
    assert grade(T.TRUE_FALSE, cfg, 1).is_correct is False


def test_fill_blank_ignores_case_spacing_and_final_punctuation():
    cfg = {"question": "x", "correct_answers": ["I am", "I'm"]}
    for ok in ["i am", "  I   AM ", "I'm.", "I am!"]:
        assert grade(T.FILL_BLANK, cfg, ok).is_correct is True
    assert grade(T.FILL_BLANK, cfg, "I is").is_correct is False
    assert grade(T.FILL_BLANK, cfg, 3).is_correct is False


def test_ordering():
    cfg = {"items": ["am", "I", "student", "a"], "correct_order": ["I", "am", "a", "student"]}
    assert grade(T.ORDERING, cfg, ["I", "am", "a", "student"]).is_correct is True
    assert grade(T.ORDERING, cfg, ["am", "I", "a", "student"]).is_correct is False
    assert grade(T.ORDERING, cfg, "I am a student").is_correct is False


def test_matching():
    cfg = {"pairs": [{"left": "Hello", "right": "Bonjour"}, {"left": "Thanks", "right": "Merci"}]}
    assert grade(T.MATCHING, cfg, {"Hello": "Bonjour", "Thanks": "Merci"}).is_correct is True
    assert grade(T.MATCHING, cfg, {"Hello": "Merci", "Thanks": "Bonjour"}).is_correct is False
    assert grade(T.MATCHING, cfg, {"Hello": "Bonjour"}).is_correct is False


def test_open_activities_are_not_graded():
    r = grade(T.SPEAKING, {"prompt": "Introduce yourself"}, "anything")
    assert r.graded is False and r.is_correct is None
    assert not is_auto_graded(T.OPEN_QUESTION, {})


def test_malformed_config_is_not_graded_rather_than_crashing():
    assert grade(T.MCQ, {"question": "x"}, 0).graded is False


def test_public_config_hides_solutions():
    cfg = {**MCQ, "explanation": "because"}
    pub = public_config(T.MCQ, cfg)
    assert "correct_answer" not in pub and "explanation" not in pub and pub["options"]
    m = public_config(
        T.MATCHING,
        {"pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "2"}]},
        seed="x",
    )
    assert "pairs" not in m and m["lefts"] == ["a", "b"] and sorted(m["rights"]) == ["1", "2"]
