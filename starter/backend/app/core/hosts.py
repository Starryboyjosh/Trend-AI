from __future__ import annotations

from ipaddress import ip_address, ip_network

from fastapi import Request
from fastapi.responses import JSONResponse


def _peer_is_trusted(request: Request, trusted_ips: list[str]) -> bool:
    if not trusted_ips:
        return False
    client = request.client
    if client is None:
        return False
    peer_ip = ip_address(client.host)
    for entry in trusted_ips:
        try:
            network = ip_network(entry, strict=False)
            if peer_ip in network:
                return True
        except ValueError:
            continue
    return False


def get_public_host(request: Request, trusted_ips: list[str]) -> str:
    if _peer_is_trusted(request, trusted_ips):
        forwarded = request.headers.get("X-Forwarded-Host")
        if forwarded:
            return forwarded.split(",")[0].strip().split(":")[0].lower()
    host = request.headers.get("Host") or "localhost"
    return host.split(":")[0].strip().lower()


async def trusted_host_middleware(request: Request, call_next):
    path = request.url.path
    if path in {"/health/live", "/health/ready"}:
        return await call_next(request)

    from app.core.config import settings

    allowed = settings.allowed_hosts
    if not allowed:
        return await call_next(request)

    host = get_public_host(request, settings.forwarded_allow_ips)
    if host not in allowed:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "INVALID_HOST",
                    "message": "Host no permitido.",
                    "retryable": False,
                }
            },
        )

    trusted = _peer_is_trusted(request, settings.forwarded_allow_ips)
    if trusted:
        forwarded_proto = request.headers.get("X-Forwarded-Proto", "").strip().lower()
        if forwarded_proto and forwarded_proto not in {"http", "https"}:
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "INVALID_FORWARDED_PROTO",
                        "message": "X-Forwarded-Proto inválido.",
                        "retryable": False,
                    }
                },
            )

    response = await call_next(request)
    return response
