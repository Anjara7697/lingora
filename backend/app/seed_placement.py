"""Banque de questions du test de niveau (idempotent). Appelée par `python -m app.seed`.

Les questions sont des activités MCQ rangées dans un programme NON publié (jamais visible dans le
catalogue). Chaque configuration porte `skill` et `cefr`, jamais envoyés au navigateur.

⚠️ Contenu provisoire : à faire valider par un enseignant d'anglais (PRD §42). Pas de Listening
(besoin d'audio) ni de Speaking (Speaking Lab) pour l'instant.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.assessment.models import Assessment, AssessmentQuestion, AssessmentType
from app.modules.learning.models import (
    Activity,
    ActivityType,
    Course,
    Difficulty,
    Lesson,
    Program,
)

BANK_SLUG = "placement-bank"

READING_TEXTS = [
    (
        "Read: « Hery gets up at 6 o'clock. He walks to school with his sister. School starts at 7:30. »\n"
        "How does Hery go to school?"
    ),
    (
        "Read: « The library will be closed on Monday because of repairs. It will reopen on Tuesday at 9 a.m. »\n"
        "When can people use the library again?"
    ),
    (
        "Read: « Dear Sam, I'm sorry I can't come to your party on Saturday. I have to work late, but I'd love "
        "to see you next week. »\nWhy can't the writer come?"
    ),
    (
        "Read: « Although the new app is free, many users say it is difficult to use. As a result, fewer people "
        "open it every week. »\nWhat is the main problem with the app?"
    ),
    (
        "Read: « The author claims that economic growth, far from reducing inequality, has often widened it. »\n"
        "What does the author suggest?"
    ),
]

# (compétence, niveau CECRL, question, options, index de la bonne réponse, explication)
QUESTIONS = [
    # --- Grammar ---
    ("GRAMMAR", "A1", "She ___ a teacher.", ["is", "are", "am"], 0, "Avec « she », on utilise « is »."),
    ("GRAMMAR", "A1", "We ___ from Madagascar.", ["is", "am", "are"], 2, "Avec « we », on utilise « are »."),
    ("GRAMMAR", "A2", "I ___ to the market yesterday.", ["go", "went", "gone"], 1, "Passé simple de « go » : went."),
    ("GRAMMAR", "A2", "There ___ two books on the table.", ["is", "are", "be"], 1, "Pluriel : « there are »."),
    ("GRAMMAR", "B1", "If it rains tomorrow, we ___ at home.", ["stay", "will stay", "would stay"], 1,
     "Première conditionnelle : if + présent, will + verbe."),
    ("GRAMMAR", "B1", "I have lived here ___ 2019.", ["for", "since", "from"], 1,
     "« since » + point de départ (2019) ; « for » + durée."),
    ("GRAMMAR", "B2", "If I ___ more time, I would learn another language.", ["have", "had", "would have"], 1,
     "Deuxième conditionnelle : if + prétérit, would + verbe."),
    ("GRAMMAR", "B2", "The report ___ by the manager before the meeting.",
     ["was reviewed", "reviewed", "was reviewing"], 0, "Voix passive : was + participe passé."),
    ("GRAMMAR", "C1", "Hardly ___ the office when the phone rang.", ["had she entered", "she had entered", "she entered"], 0,
     "Après « Hardly », inversion sujet-auxiliaire : had she entered."),
    ("GRAMMAR", "C1", "I wish I ___ that email yesterday.", ["didn't send", "hadn't sent", "wouldn't send"], 1,
     "Regret sur le passé : wish + past perfect."),
    # --- Vocabulary ---
    ("VOCABULARY", "A1", "Choose the opposite of « big ».", ["small", "tall", "old"], 0, "L'opposé de « big » est « small »."),
    ("VOCABULARY", "A1", "A person who teaches students is a ___.", ["doctor", "teacher", "driver"], 1,
     "« teacher » = enseignant."),
    ("VOCABULARY", "A2", "She wears glasses because she cannot ___ well.", ["see", "look", "watch"], 0,
     "« see » = percevoir avec les yeux."),
    ("VOCABULARY", "A2", "The opposite of « cheap » is ___.", ["expensive", "easy", "quick"], 0,
     "« expensive » = cher."),
    ("VOCABULARY", "B1", "The meeting was ___ until next week because the manager was ill.",
     ["postponed", "stopped", "finished"], 0, "« postpone » = reporter."),
    ("VOCABULARY", "B1", "Please ___ your phone off during the flight.", ["turn", "do", "cut"], 0,
     "« turn off » = éteindre."),
    ("VOCABULARY", "B2", "The company decided to ___ its prices to attract more customers.",
     ["lower", "shorten", "descend"], 0, "« lower prices » = baisser les prix."),
    ("VOCABULARY", "B2", "Her presentation was so ___ that everyone was listening carefully.",
     ["engaging", "tiring", "pointless"], 0, "« engaging » = captivant."),
    ("VOCABULARY", "C1", "The new policy will ___ a significant change in how we work.",
     ["bring about", "bring down", "bring along"], 0, "« bring about » = provoquer, entraîner."),
    ("VOCABULARY", "C1", "He gave a ___ explanation that left no room for doubt.", ["lucid", "tedious", "hasty"], 0,
     "« lucid » = limpide, très clair."),
    # --- Reading ---
    ("READING", "A2", READING_TEXTS[0], ["By bus", "On foot", "By car"], 1, "« walks to school » = à pied."),
    ("READING", "B1", READING_TEXTS[1], ["On Monday", "On Tuesday morning", "On Tuesday evening"], 1,
     "« reopen on Tuesday at 9 a.m. » = mardi matin."),
    ("READING", "B1", READING_TEXTS[2], ["They are ill", "They have to work", "They are travelling"], 1,
     "« I have to work late »."),
    ("READING", "B2", READING_TEXTS[3], ["It costs too much", "It is hard to use", "It opens slowly"], 1,
     "« difficult to use »."),
    ("READING", "C1", READING_TEXTS[4],
     ["Growth has made inequality smaller", "Growth has sometimes made inequality bigger",
      "Growth has no effect on inequality"], 1, "« far from reducing... has often widened it »."),
]


def seed_placement(db: Session) -> None:
    program = db.scalar(select(Program).where(Program.slug == BANK_SLUG))
    if not program:
        program = Program(slug=BANK_SLUG, name="Banque du test de niveau", difficulty=Difficulty.BEGINNER)
        db.add(program)
    program.is_published = False  # jamais visible dans le catalogue
    db.flush()
    course = db.scalar(select(Course).where(Course.program_id == program.id, Course.slug == "placement"))
    if not course:
        course = Course(program_id=program.id, slug="placement", title="Placement", position=1,
                        difficulty=Difficulty.BEGINNER)
        db.add(course)
    course.is_published = False
    db.flush()
    lesson = db.scalar(select(Lesson).where(Lesson.course_id == course.id, Lesson.slug == "placement-v1"))
    if not lesson:
        lesson = Lesson(course_id=course.id, slug="placement-v1", title="Test de niveau v1", position=1)
        db.add(lesson)
    lesson.is_published = False
    db.flush()

    assessment = db.scalar(
        select(Assessment).where(Assessment.type == AssessmentType.PLACEMENT, Assessment.version == 1)
    )
    if not assessment:
        assessment = Assessment(name="Test de niveau", type=AssessmentType.PLACEMENT, version=1)
        db.add(assessment)
    assessment.description = "Évaluez votre niveau d'anglais (grammaire, vocabulaire, lecture)."
    assessment.instructions = "Répondez à chaque question sans aide extérieure. Il n'y a pas de pénalité."
    assessment.is_published = True
    db.flush()

    for pos, (skill, cefr, question, options, answer, explanation) in enumerate(QUESTIONS, start=1):
        config = {
            "question": question, "options": options, "correct_answer": answer,
            "explanation": explanation, "skill": skill, "cefr": cefr,
        }
        activity = db.scalar(select(Activity).where(Activity.lesson_id == lesson.id, Activity.position == pos))
        if not activity:
            activity = Activity(lesson_id=lesson.id, position=pos, type=ActivityType.MCQ, title=f"Q{pos}")
            db.add(activity)
        activity.type, activity.title, activity.configuration = ActivityType.MCQ, f"Q{pos}", config
        db.flush()
        aq = db.scalar(
            select(AssessmentQuestion).where(
                AssessmentQuestion.assessment_id == assessment.id, AssessmentQuestion.position == pos
            )
        )
        if not aq:
            db.add(AssessmentQuestion(assessment_id=assessment.id, activity_id=activity.id, position=pos))
        else:
            aq.activity_id = activity.id
    db.commit()
