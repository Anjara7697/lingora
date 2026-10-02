from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"data": {"status": "ok"}, "meta": {}, "error": None}


@router.get("/ready")
def ready(db: Annotated[Session, Depends(get_db)]):
    db.execute(text("SELECT 1"))
    return {"data": {"status": "ready"}, "meta": {}, "error": None}
