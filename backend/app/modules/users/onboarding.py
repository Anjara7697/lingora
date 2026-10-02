"""Onboarding (CDC F04) : objectif principal + temps de pratique quotidien."""

import enum

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.assessment.models import StudentLearningProfile
from app.modules.identity.models import User
from app.modules.progress.models import Goal, GoalStatus

DAILY_TYPE = "DAILY_PRACTICE"


class PrimaryGoal(enum.Enum):
    IMPROVE_SPEAKING = "IMPROVE_SPEAKING"
    PREPARE_INTERVIEW = "PREPARE_INTERVIEW"
    ENGLISH_FOR_WORK = "ENGLISH_FOR_WORK"
    STUDY = "STUDY"
    TRAVEL = "TRAVEL"
    BUSINESS_ENGLISH = "BUSINESS_ENGLISH"
    GENERAL_ENGLISH = "GENERAL_ENGLISH"


class OnboardingIn(BaseModel):
    primary_goal: PrimaryGoal
    daily_minutes: int = Field(ge=5, le=240)


class OnboardingOut(BaseModel):
    primary_goal: PrimaryGoal
    daily_minutes: int | None


def _daily_goal(db: Session, user: User) -> Goal | None:
    return db.scalar(
        select(Goal).where(
            Goal.student_id == user.id, Goal.type == DAILY_TYPE, Goal.status == GoalStatus.ACTIVE
        )
    )


def get_onboarding(db: Session, user: User) -> OnboardingOut | None:
    profile = db.scalar(select(StudentLearningProfile).where(StudentLearningProfile.student_id == user.id))
    if not profile or not profile.primary_goal:
        return None
    goal = _daily_goal(db, user)
    minutes = int(goal.target_value) if goal and goal.target_value else None
    return OnboardingOut(primary_goal=PrimaryGoal(profile.primary_goal), daily_minutes=minutes)


def save_onboarding(db: Session, user: User, data: OnboardingIn) -> OnboardingOut:
    profile = db.scalar(select(StudentLearningProfile).where(StudentLearningProfile.student_id == user.id))
    if not profile:
        profile = StudentLearningProfile(student_id=user.id)
        db.add(profile)
    profile.primary_goal = data.primary_goal.value

    goal = _daily_goal(db, user)
    if not goal:
        goal = Goal(student_id=user.id, type=DAILY_TYPE, title="")
        db.add(goal)
    goal.title = f"Pratiquer {data.daily_minutes} minutes par jour"
    goal.target_value = data.daily_minutes
    db.commit()
    return OnboardingOut(primary_goal=data.primary_goal, daily_minutes=data.daily_minutes)
