"""Scénarios Speaking de démonstration (idempotent). Appelée par `python -m app.seed`.

⚠️ Provisoire : à faire valider par un enseignant d'anglais (PRD §42).
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.learning.models import Difficulty, Skill
from app.modules.speaking.models import SpeakingScenario, SpeakingScenarioSkill

D = Difficulty
# (slug, titre, description FR, consigne EN, difficulté, minutes)
SCENARIOS = [
    ("introduce-yourself", "Se présenter", "Votre premier jour avec un nouveau collègue.",
     ("You meet a new colleague on your first day. Introduce yourself: say your name, where you are from "
     "and what you do."), D.BEGINNER, 3),
    ("daily-routine", "Ma journée type", "Décrire votre journée habituelle.",
     "A friend asks you: 'What do you usually do on a normal day?' Describe your daily routine.",
     D.BEGINNER, 3),
    ("travel-airport", "À l'aéroport", "Enregistrement et questions de l'agent.",
     ("You are at the airport check-in desk. The agent asks: 'Where are you travelling to, and how long will "
     "you stay?' Answer, then ask about your luggage."), D.ELEMENTARY, 4),
    ("hotel-reception", "À la réception d'un hôtel", "Réservation, petit-déjeuner et Wi-Fi.",
     ("You arrive at a hotel in Antananarivo. Tell the receptionist you have a reservation and ask about "
     "breakfast and the Wi-Fi."), D.ELEMENTARY, 4),
    ("job-interview", "Entretien d'embauche", "Se présenter et motiver sa candidature.",
     ("You are attending a job interview for a junior developer position. The interviewer says: 'Tell me "
     "about yourself and why you want this job.'"), D.INTERMEDIATE, 5),
    ("client-meeting", "Réunion avec un client", "Expliquer un retard et proposer une solution.",
     ("You are in a meeting with an international client. They are unhappy about a delay. Explain the "
     "problem and propose a solution."), D.UPPER_INTERMEDIATE, 5),
]
SKILL_WEIGHTS = {"SPEAKING": 1, "FLUENCY": 1, "VOCABULARY": 1, "GRAMMAR": 1}


def seed_speaking(db: Session) -> None:
    skills = {s.code: s.id for s in db.scalars(select(Skill).where(Skill.code.in_(SKILL_WEIGHTS)))}
    for slug, title, description, context, difficulty, minutes in SCENARIOS:
        scenario = db.scalar(select(SpeakingScenario).where(SpeakingScenario.slug == slug))
        if not scenario:
            scenario = SpeakingScenario(slug=slug, title=title, difficulty=difficulty)
            db.add(scenario)
        scenario.title, scenario.description, scenario.context = title, description, context
        scenario.difficulty, scenario.estimated_minutes, scenario.is_published = difficulty, minutes, True
        db.flush()
        for code, weight in SKILL_WEIGHTS.items():
            if code in skills and not db.get(SpeakingScenarioSkill, (scenario.id, skills[code])):
                db.add(SpeakingScenarioSkill(scenario_id=scenario.id, skill_id=skills[code], weight=weight))
    db.commit()
