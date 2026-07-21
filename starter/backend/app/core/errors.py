from __future__ import annotations

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class AppError(HTTPException):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        retryable: bool = False,
    ) -> None:
        self.code = code
        self.message = message
        self.retryable = retryable
        super().__init__(status_code=status_code, detail=self._envelope())

    def _envelope(self) -> dict:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "retryable": self.retryable,
            }
        }


class NotFoundError(AppError):
    def __init__(self, entity: str = "Recurso") -> None:
        super().__init__(
            code="NOT_FOUND",
            message=f"{entity} no encontrado.",
            status_code=404,
        )


class ForbiddenError(AppError):
    def __init__(self, message: str = "No tienes acceso a este recurso.") -> None:
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=403,
        )


class ValidationError_(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(code="VALIDATION_ERROR", message=message, status_code=422)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc._envelope())
