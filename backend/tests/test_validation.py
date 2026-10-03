import pytest

from app.modules.learning.grading import grade, is_auto_graded
from app.modules.learning.models import ActivityType as T
from app.modules.learning.validation import ConfigInvalid, validate_activity

MCQ = {"question": "I ___ a student", "options": ["am", "is", "are"], "correct_answer": 0}


def errors_of(t, cfg):
    with pytest.raises(ConfigInvalid) as exc:
        validate_activity(t, cfg)
    return exc.value.errors


def test_valid_mcq_is_returned_clean_and_unknown_keys_are_dropped():
    out = validate_activity(T.MCQ, {**MCQ, "junk": "x", "correct_answers": [1]})
    assert out == MCQ


@pytest.mark.parametrize("cfg", [
    {**MCQ, "correct_answer": 3},                     # hors limites
    {**MCQ, "correct_answer": True},                  # un booléen n'est pas un index
    {**MCQ, "correct_answer": "0"},
    {**MCQ, "options": ["only one"], "correct_answer": 0},
    {**MCQ, "options": ["a", "A", "b"]},              # doublons
    {**MCQ, "options": ["a", "", "b"]},
    {**MCQ, "options": ["1", "2", "3", "4", "5", "6", "7"]},
    {"options": ["a", "b"], "correct_answer": 0},     # pas de question
    {**MCQ, "question": "x" * 501},
])
def test_invalid_mcq(cfg):
    assert errors_of(T.MCQ, cfg)


def test_listening_and_reading_use_the_same_rules_as_mcq():
    assert validate_activity(T.READING, MCQ) == MCQ
    assert errors_of(T.LISTENING, {"question": "q"})


def test_true_false_needs_a_real_boolean():
    assert validate_activity(T.TRUE_FALSE, {"question": "x", "correct_answer": False})["correct_answer"] is False
    assert errors_of(T.TRUE_FALSE, {"question": "x", "correct_answer": 1})
    assert errors_of(T.TRUE_FALSE, {"question": "x"})


def test_fill_blank_requires_a_blank_and_answers():
    ok = validate_activity(T.FILL_BLANK, {"question": "My name ___ Hery.", "correct_answers": [" is "]})
    assert ok["correct_answers"] == ["is"]
    assert any("___" in e for e in errors_of(T.FILL_BLANK, {"question": "My name is Hery.", "correct_answers": ["is"]}))
    assert errors_of(T.FILL_BLANK, {"question": "My name ___.", "correct_answers": []})
    # une traduction n'a pas besoin de trou
    assert validate_activity(T.TRANSLATION, {"question": "Merci", "correct_answers": ["Thank you"]})


def test_ordering_derives_a_shuffled_pool_that_differs_from_the_answer():
    out = validate_activity(T.ORDERING, {"correct_order": ["I", "am", "a", "student"]})
    assert sorted(out["items"]) == sorted(out["correct_order"]) and out["items"] != out["correct_order"]
    again = validate_activity(T.ORDERING, {"correct_order": ["I", "am", "a", "student"]})
    assert again["items"] == out["items"]  # déterministe : pas de changement à chaque sauvegarde
    assert errors_of(T.ORDERING, {"correct_order": ["only"]})
    assert errors_of(T.ORDERING, {"correct_order": ["a", "b"], "items": ["a", "c"]})
    assert validate_activity(T.ORDERING, {"correct_order": ["a", "b"], "items": ["b", "a"]})["items"] == ["b", "a"]


def test_matching_rules():
    ok = {"pairs": [{"left": "Hello", "right": "Bonjour"}, {"left": "Thanks", "right": "Merci"}]}
    assert validate_activity(T.MATCHING, ok)["pairs"] == ok["pairs"]
    assert errors_of(T.MATCHING, {"pairs": ok["pairs"][:1]})
    assert errors_of(T.MATCHING, {"pairs": [{"left": "a", "right": "1"}, {"left": "A", "right": "2"}]})
    assert errors_of(T.MATCHING, {"pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "1"}]})
    assert errors_of(T.MATCHING, {"pairs": [{"left": "a"}, {"left": "b", "right": "2"}]})


def test_free_text_activities_need_a_prompt_and_keep_no_solutions():
    out = validate_activity(T.SPEAKING, {"prompt": "Introduce yourself", "example": "Hello!", "explanation": "x"})
    assert out == {"prompt": "Introduce yourself", "example": "Hello!"}
    assert errors_of(T.OPEN_QUESTION, {})
    assert errors_of(T.WRITING, {"prompt": "   "})


def test_non_object_config_is_rejected():
    for bad in (None, "x", [], 3):
        assert errors_of(T.MCQ, bad) == ["La configuration doit être un objet."]


@pytest.mark.parametrize(("t", "cfg", "answer"), [
    (T.MCQ, MCQ, 0),
    (T.TRUE_FALSE, {"question": "x", "correct_answer": True}, True),
    (T.FILL_BLANK, {"question": "A ___", "correct_answers": ["b"]}, "B"),
    (T.ORDERING, {"correct_order": ["I", "am"]}, ["I", "am"]),
    (T.MATCHING, {"pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "2"}]}, {"a": "1", "b": "2"}),
])
def test_everything_the_cms_accepts_is_gradable_by_the_student_engine(t, cfg, answer):
    clean = validate_activity(t, cfg)
    assert is_auto_graded(t, clean)
    assert grade(t, clean, answer).is_correct is True


def test_existing_demo_content_passes_the_validator():
    from app.seed import PROGRAMS

    for program in PROGRAMS:
        for course in program["courses"]:
            for lesson in course["lessons"]:
                for atype, _title, _instr, _pts, cfg in lesson["activities"]:
                    validate_activity(atype, cfg)
