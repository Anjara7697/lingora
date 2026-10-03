"""Erreurs applicatives et enveloppe de réponse {data, meta, error} (architecture §30)."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: list[dict] | None = None,
                 headers: dict[str, str] | None = None):
        self.status_code, self.code, self.message, self.details = status_code, code, message, details
        self.headers = headers


def envelope(data=None, meta=None, error=None) -> dict:
    return {"data": data, "meta": meta or {}, "error": error}


def _error(status: int, code: str, message: str, details=None, headers=None) -> JSONResponse:
    err = {"code": code, "message": message}
    if details is not None:
        err["details"] = details
    return JSONResponse(status_code=status, content=envelope(error=err), headers=headers)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return _error(exc.status_code, exc.code, exc.message, exc.details, exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        return _error(exc.status_code, f"HTTP_{exc.status_code}", str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        details = [
            {"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"].removeprefix("Value error, ")}
            for e in exc.errors()
        ]
        return _error(422, "VALIDATION_ERROR", "Données invalides", details)
