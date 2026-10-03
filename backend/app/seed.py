"""Contenu de démonstration (idempotent) : `python -m app.seed`.

⚠️ Contenu provisoire pour développer et tester ; il doit être relu/validé par un enseignant
d'anglais avant toute utilisation avec de vrais apprenants (PRD §42).
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.modules.learning.models import (
    Activity,
    ActivityType,
    CefrLevel,
    Content,
    ContentType,
    Course,
    CourseSkill,
    Difficulty,
    Lesson,
    LessonContent,
    LessonSkill,
    Program,
    Skill,
)
from app.seed_billing import seed_billing
from app.seed_placement import seed_placement
from app.seed_speaking import seed_speaking

T = ActivityType


def mcq(question, options, answer, explanation):
    return {"question": question, "options": options, "correct_answer": answer, "explanation": explanation}


def fill(question, answers, explanation):
    return {"question": question, "correct_answers": answers, "explanation": explanation}


def order(question, items, correct, explanation):
    return {"question": question, "items": items, "correct_order": correct, "explanation": explanation}


def match(question, pairs):
    return {"question": question, "pairs": [{"left": left, "right": right} for left, right in pairs]}


def tf(question, answer, explanation):
    return {"question": question, "correct_answer": answer, "explanation": explanation}


# (type, titre, consigne, points, configuration)
PROGRAMS = [
    {
        "name": "English Speaking",
        "slug": "english-speaking",
        "description": (
            "12 semaines pour parler anglais avec confiance : de la présentation personnelle "
            "aux situations professionnelles."
        ),
        "difficulty": Difficulty.BEGINNER,
        "duration_weeks": 12,
        "courses": [
            {
                "title": "Mois 1 — Confiance",
                "slug": "mois-1-confiance",
                "description": "Se présenter, parler de sa famille et de son travail.",
                "estimated_minutes": 90,
                "lessons": [
                    {
                        "title": "Se présenter",
                        "slug": "se-presenter",
                        "description": "Dire qui vous êtes, d'où vous venez et saluer.",
                        "minutes": 25,
                        "skills": ["SPEAKING", "VOCABULARY", "GRAMMAR"],
                        "content": [
                            (
                                "Les salutations",
                                (
                                    "Hello! / Hi! — Bonjour ! / Salut !\nGood morning — Bonjour (le matin)\n"
                                    "Nice to meet you — Enchanté(e)\nGoodbye — Au revoir"
                                ),
                            ),
                            (
                                "Se présenter avec « I am »",
                                (
                                    "I am Anjara. — Je m'appelle Anjara.\nI am from Madagascar. — Je viens de "
                                    "Madagascar.\nMy name is Hery. — Mon nom est Hery.\n\nAvec « I », on utilise "
                                    "toujours « am » : I am (I'm)."
                                ),
                            ),
                        ],
                        "activities": [
                            (T.MCQ, "Choisir la bonne phrase", "Choisissez la phrase correcte.", 1,
                             mcq("Choose the correct sentence.", ["I am Anjara.", "I is Anjara.", "I are Anjara."],
                                 0, "Avec « I », on utilise « am »."))
                            ,
                            (T.FILL_BLANK, "Compléter la phrase", "Complétez avec le mot manquant.", 1,
                             fill("My name ___ Hery.", ["is"], "Avec « my name », on utilise « is ».")),
                            (T.ORDERING, "Remettre en ordre", "Remettez les mots dans le bon ordre.", 2,
                             order("Make a sentence.", ["from", "I", "Madagascar", "am"],
                                   ["I", "am", "from", "Madagascar"], "I am from Madagascar.")),
                            (T.MATCHING, "Associer les mots", "Associez chaque expression à sa traduction.", 2,
                             match("Match the words.", [("Hello", "Bonjour"), ("Goodbye", "Au revoir"),
                                                         ("Nice to meet you", "Enchanté(e)"), ("Thank you", "Merci")])),
                            (T.TRUE_FALSE, "Vrai ou faux ?", "Cette phrase est-elle correcte ?", 1,
                             tf("« How are you? » signifie « Comment allez-vous ? ».", True,
                                "Oui : on répond par exemple « I'm fine, thank you. »")),
                            (T.SPEAKING, "À vous de parler !", "Dites à voix haute, en anglais.", 1,
                             {"prompt": "Introduce yourself in 3 sentences: your name, your country, what you do.",
                              "example": "Hello! I am Anjara. I am from Madagascar. I am a student."}),
                        ],
                    },
                    {
                        "title": "Parler de sa famille",
                        "slug": "parler-de-sa-famille",
                        "description": "Présenter les membres de votre famille.",
                        "minutes": 25,
                        "skills": ["SPEAKING", "VOCABULARY"],
                        "content": [
                            (
                                "Le vocabulaire de la famille",
                                "mother — mère\nfather — père\nbrother — frère\nsister — sœur\nparents — parents",
                            ),
                            (
                                "« to be » et « to have »",
                                (
                                    "She is my sister. — C'est ma sœur.\nI have two brothers. — J'ai deux frères.\n"
                                    "He has a sister. — Il a une sœur. (avec he/she : « has »)"
                                ),
                            ),
                        ],
                        "activities": [
                            (T.MCQ, "Choisir le bon verbe", "Choisissez la bonne forme.", 1,
                             mcq("She ___ my sister.", ["is", "am", "are"], 0, "Avec « she », on utilise « is ».")),
                            (T.FILL_BLANK, "Compléter la phrase", "Complétez avec le bon verbe.", 1,
                             fill("I ___ two brothers.", ["have"], "Avec « I », on utilise « have ».")),
                            (T.MATCHING, "Associer les membres de la famille", "Associez chaque mot à sa traduction.", 2,
                             match("Match the family words.", [("mother", "mère"), ("father", "père"),
                                                                ("brother", "frère"), ("sister", "sœur")])),
                            (T.ORDERING, "Remettre en ordre", "Remettez les mots dans le bon ordre.", 2,
                             order("Make a sentence.", ["has", "He", "a", "sister"], ["He", "has", "a", "sister"],
                                   "Avec « he », on utilise « has ».")),
                            (T.TRUE_FALSE, "Vrai ou faux ?", "Cette traduction est-elle correcte ?", 1,
                             tf("« My parents are teachers » signifie « Mes parents sont enseignants ».", True,
                                "« parents » = parents ; « teachers » = enseignants.")),
                            (T.SPEAKING, "À vous de parler !", "Dites à voix haute, en anglais.", 1,
                             {"prompt": "Talk about your family: who is in your family?",
                              "example": "I have two brothers and one sister. My mother is a teacher."}),
                        ],
                    },
                    {
                        "title": "Parler de son travail et de ses études",
                        "slug": "travail-et-etudes",
                        "description": "Dire ce que vous faites dans la vie.",
                        "minutes": 30,
                        "skills": ["SPEAKING", "VOCABULARY", "GRAMMAR"],
                        "content": [
                            (
                                "Les métiers",
                                (
                                    "teacher — enseignant(e)\nstudent — étudiant(e)\ndoctor — médecin\n"
                                    "developer — développeur(se)"
                                ),
                            ),
                            (
                                "Dire ce que l'on fait",
                                (
                                    "I am a student. — Je suis étudiant.\nI work in a bank. — Je travaille dans une "
                                    "banque.\nShe studies at university. — Elle étudie à l'université.\n\n"
                                    "Avec he/she, le verbe prend un « s » : she works, she studies."
                                ),
                            ),
                        ],
                        "activities": [
                            (T.MCQ, "Choisir la bonne forme", "Choisissez la bonne phrase.", 1,
                             mcq("I ___ in a bank.", ["work", "works", "am work"], 0,
                                 "Avec « I », le verbe reste à la forme de base : work.")),
                            (T.FILL_BLANK, "Compléter la phrase", "Complétez avec le bon verbe.", 1,
                             fill("She ___ at university.", ["studies"], "Avec « she », on ajoute « s » : studies.")),
                            (T.MATCHING, "Associer les métiers", "Associez chaque métier à sa traduction.", 2,
                             match("Match the jobs.", [("teacher", "enseignant"), ("student", "étudiant"),
                                                        ("doctor", "médecin"), ("developer", "développeur")])),
                            (T.ORDERING, "Remettre en ordre", "Remettez les mots dans le bon ordre.", 2,
                             order("Make a sentence.", ["a", "I", "am", "developer"],
                                   ["I", "am", "a", "developer"], "I am a developer.")),
                            (T.TRUE_FALSE, "Vrai ou faux ?", "Cette traduction est-elle correcte ?", 1,
                             tf("« I am a student » signifie « Je suis étudiant ».", True,
                                "« student » = étudiant(e).")),
                            (T.OPEN_QUESTION, "Votre réponse", "Répondez en anglais, par écrit.", 1,
                             {"prompt": "What do you do? Answer in one or two sentences."}),
                            (T.SPEAKING, "À vous de parler !", "Dites à voix haute, en anglais.", 1,
                             {"prompt": "Speak for one minute about your work or your studies.",
                              "example": "I am a student. I study computer science. I like it very much."}),
                        ],
                    },
                ],
            }
        ],
    },
    {
        "name": "English Start",
        "slug": "english-start",
        "description": "Les toutes premières bases de l'anglais, pour démarrer en douceur.",
        "difficulty": Difficulty.BEGINNER,
        "duration_weeks": 4,
        "courses": [
            {
                "title": "Les bases",
                "slug": "les-bases",
                "description": "Saluer et se présenter.",
                "estimated_minutes": 15,
                "lessons": [
                    {
                        "title": "Hello!",
                        "slug": "hello",
                        "description": "Vos premiers mots en anglais.",
                        "minutes": 15,
                        "skills": ["VOCABULARY"],
                        "content": [("Premiers mots", "Hello — Bonjour\nThank you — Merci\nPlease — S'il vous plaît")],
                        "activities": [
                            (T.MCQ, "Traduire « Merci »", "Choisissez la bonne réponse.", 1,
                             mcq("How do you say « Merci » in English?", ["Please", "Thank you", "Goodbye"], 1,
                                 "« Thank you » = merci.")),
                            (T.MATCHING, "Associer les mots", "Associez chaque mot à sa traduction.", 2,
                             match("Match the words.", [("Hello", "Bonjour"), ("Please", "S'il vous plaît"),
                                                         ("Thank you", "Merci")])),
                            (T.FILL_BLANK, "Compléter la phrase", "Complétez avec le mot manquant.", 1,
                             fill("Nice to ___ you.", ["meet"], "« Nice to meet you » = enchanté(e).")),
                        ],
                    }
                ],
            }
        ],
    },
]


def _skill_ids(db: Session, codes: list[str]) -> list:
    return list(db.scalars(select(Skill.id).where(Skill.code.in_(codes))))


def seed_demo_content(db: Session) -> None:
    for pdata in PROGRAMS:
        program = db.scalar(select(Program).where(Program.slug == pdata["slug"]))
        if not program:
            program = Program(slug=pdata["slug"], name=pdata["name"], difficulty=pdata["difficulty"])
            db.add(program)
        program.name, program.description = pdata["name"], pdata["description"]
        program.duration_weeks, program.is_published = pdata["duration_weeks"], True
        db.flush()

        for cpos, cdata in enumerate(pdata["courses"], start=1):
            course = db.scalar(
                select(Course).where(Course.program_id == program.id, Course.slug == cdata["slug"])
            )
            if not course:
                course = Course(program_id=program.id, slug=cdata["slug"], title=cdata["title"],
                                position=cpos, difficulty=pdata["difficulty"])
                db.add(course)
            course.title, course.description = cdata["title"], cdata["description"]
            course.estimated_minutes, course.is_published = cdata["estimated_minutes"], True
            db.flush()
            _link_course_skills(db, course, ["SPEAKING", "VOCABULARY", "GRAMMAR"])

            for lpos, ldata in enumerate(cdata["lessons"], start=1):
                _seed_lesson(db, course, lpos, ldata)
    db.commit()


def _link_course_skills(db: Session, course: Course, codes: list[str]) -> None:
    for sid in _skill_ids(db, codes):
        if not db.get(CourseSkill, (course.id, sid)):
            db.add(CourseSkill(course_id=course.id, skill_id=sid, target_level=CefrLevel.A2))


def _seed_lesson(db: Session, course: Course, position: int, data: dict) -> None:
    lesson = db.scalar(select(Lesson).where(Lesson.course_id == course.id, Lesson.slug == data["slug"]))
    if not lesson:
        lesson = Lesson(course_id=course.id, slug=data["slug"], title=data["title"], position=position)
        db.add(lesson)
    lesson.title, lesson.description = data["title"], data["description"]
    lesson.position, lesson.estimated_minutes, lesson.is_published = position, data["minutes"], True
    db.flush()

    for sid in _skill_ids(db, data["skills"]):
        if not db.get(LessonSkill, (lesson.id, sid)):
            db.add(LessonSkill(lesson_id=lesson.id, skill_id=sid))

    has_content = db.scalar(select(LessonContent.id).where(LessonContent.lesson_id == lesson.id))
    if not has_content:
        for i, (title, body) in enumerate(data["content"], start=1):
            content = Content(type=ContentType.TEXT, title=title, body=body)
            db.add(content)
            db.flush()
            db.add(LessonContent(lesson_id=lesson.id, content_id=content.id, position=i))

    for apos, (atype, title, instructions, points, config) in enumerate(data["activities"], start=1):
        activity = db.scalar(
            select(Activity).where(Activity.lesson_id == lesson.id, Activity.position == apos)
        )
        if not activity:
            activity = Activity(lesson_id=lesson.id, position=apos, type=atype, title=title)
            db.add(activity)
        activity.type, activity.title, activity.instructions = atype, title, instructions
        activity.points, activity.configuration = points, config
        activity.difficulty = Difficulty.BEGINNER


DEMO_STAFF = [
    ("teacher.demo@example.com", "TEACHER", "Teacher-demo-1", "Hanta", "Enseignante"),
    ("admin.demo@example.com", "ADMIN", "Admin-demo-1", "Admin", "Lingora"),
]


def seed_demo_staff(db: Session) -> None:
    """Comptes de démonstration, UNIQUEMENT en développement (mots de passe publics dans le dépôt)."""
    from sqlalchemy import select

    from app.cli import create_user
    from app.core.config import settings
    from app.modules.identity.models import User

    if settings.environment != "development":
        return
    for email, role, password, first, last in DEMO_STAFF:
        if not db.scalar(select(User).where(User.email == email)):
            create_user(db, email, role, password, first, last)


def main() -> None:
    with SessionLocal() as db:
        seed_demo_content(db)
        seed_placement(db)
        seed_speaking(db)
        seed_billing(db)
        seed_demo_staff(db)
    print("Contenu de démonstration prêt.")


if __name__ == "__main__":
    main()
