from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.modules.admin.router import router as admin_router
from app.modules.assessment.router import router as assessment_router
from app.modules.auth.router import router as auth_router
from app.modules.cms.router import router as cms_router
from app.modules.commerce.router import router as billing_router
from app.modules.health.router import router as health_router
from app.modules.learning.router import router as learning_router
from app.modules.platform.router import router as platform_router
from app.modules.speaking.router import router as speaking_router
from app.modules.teacher.router import router as teacher_router
from app.modules.users.router import router as users_router
from app.shared.errors import register_error_handlers


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    settings.validate_for_runtime()
    yield


app = FastAPI(title=settings.app_name, version="0.2.0", lifespan=lifespan)
register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(auth_router)
api_v1.include_router(users_router)
api_v1.include_router(admin_router)
api_v1.include_router(cms_router)
api_v1.include_router(learning_router)
api_v1.include_router(assessment_router)
api_v1.include_router(speaking_router)
api_v1.include_router(teacher_router)
api_v1.include_router(billing_router)
api_v1.include_router(platform_router)
app.include_router(api_v1)
