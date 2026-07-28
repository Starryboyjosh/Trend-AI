from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_cors_allowed_origin() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.options(
            "/health/live",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.status_code in {200, 204}
    cors_origin = response.headers.get("access-control-allow-origin")
    assert cors_origin == "http://localhost:3000"
    assert "access-control-allow-credentials" in response.headers


@pytest.mark.asyncio
async def test_cors_rejected_origin() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.options(
            "/health/live",
            headers={
                "Origin": "https://evil.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.status_code in {200, 400}
    cors_origin = response.headers.get("access-control-allow-origin")
    assert cors_origin is None or cors_origin == "null"


@pytest.mark.asyncio
async def test_cors_valid_preflight() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,x-csrf-token",
            },
        )
    assert response.status_code in {200, 204}
    assert response.headers.get("access-control-allow-methods")
    allowed_headers = response.headers.get("access-control-allow-headers", "").lower()
    assert "content-type" in allowed_headers


@pytest.mark.asyncio
async def test_cors_preflight_rejected() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "https://unknown.com",
                "Access-Control-Request-Method": "POST",
            },
        )
    assert response.status_code in {200, 400}
    cors_origin = response.headers.get("access-control-allow-origin")
    assert cors_origin is None or cors_origin == "null"


@pytest.mark.asyncio
async def test_cors_multiple_origins() -> None:
    import app.core.config as config_module

    original = config_module.settings.app_env
    try:
        config_module.settings.app_env = "test"
        from fastapi import FastAPI
        from starlette.middleware.cors import CORSMiddleware

        test_app = FastAPI()
        test_app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000", "http://localhost:4000"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @test_app.get("/health/live")
        async def _hl():
            return {"status": "ok"}

        async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
            response = await client.options(
                "/health/live",
                headers={
                    "Origin": "http://localhost:4000",
                    "Access-Control-Request-Method": "GET",
                },
            )
        assert response.status_code in {200, 204}
        cors_origin = response.headers.get("access-control-allow-origin")
        assert cors_origin == "http://localhost:4000"
    finally:
        config_module.settings.app_env = original


@pytest.mark.asyncio
async def test_cors_no_origin() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health/live")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_cors_credentials_sent() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.options(
            "/health/live",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.headers.get("access-control-allow-credentials") == "true"


@pytest.mark.asyncio
async def test_allowed_host_accepted() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health/live", headers={"Host": "localhost"})
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_forwarded_proto_not_trusted_without_proxy() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/health/live",
            headers={
                "X-Forwarded-Proto": "https",
                "X-Forwarded-For": "1.2.3.4",
            },
        )
    assert response.status_code == 200


# --- Trusted host tests ---

@pytest.mark.asyncio
async def test_host_direct_tamper_x_forwarded_host() -> None:
    import app.core.config as config_module

    original_hosts = config_module.settings.allowed_hosts_str
    config_module.settings.allowed_hosts_str = "api.example.com"
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/google/status",
                headers={
                    "Host": "api.example.com",
                    "X-Forwarded-Host": "evil.com",
                },
            )
        assert response.status_code == 200
    finally:
        config_module.settings.allowed_hosts_str = original_hosts


@pytest.mark.asyncio
async def test_host_direct_x_forwarded_for_ignored() -> None:
    import app.core.config as config_module

    original_hosts = config_module.settings.allowed_hosts_str
    config_module.settings.allowed_hosts_str = "api.example.com"
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/google/status",
                headers={
                    "Host": "api.example.com",
                    "X-Forwarded-For": "1.2.3.4, 10.0.0.1",
                },
            )
        assert response.status_code == 200
    finally:
        config_module.settings.allowed_hosts_str = original_hosts


@pytest.mark.asyncio
async def test_host_rejected() -> None:
    import app.core.config as config_module

    original_hosts = config_module.settings.allowed_hosts_str
    config_module.settings.allowed_hosts_str = "api.example.com"
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/google/status",
                headers={"Host": "evil.com"},
            )
        assert response.status_code == 400
    finally:
        config_module.settings.allowed_hosts_str = original_hosts


@pytest.mark.asyncio
async def test_host_invalid_not_reflected_in_body() -> None:
    import app.core.config as config_module

    original_hosts = config_module.settings.allowed_hosts_str
    config_module.settings.allowed_hosts_str = "api.example.com"
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/google/status",
                headers={"Host": "evil.com"},
            )
        body = response.text.lower()
        assert "evil" not in body
    finally:
        config_module.settings.allowed_hosts_str = original_hosts


@pytest.mark.asyncio
async def test_invalid_forwarded_proto_rejected() -> None:
    import app.core.config as config_module

    original_hosts = config_module.settings.allowed_hosts_str
    original_forwarded = config_module.settings.forwarded_allow_ips_str
    config_module.settings.allowed_hosts_str = "api.example.com"
    config_module.settings.forwarded_allow_ips_str = "127.0.0.1"
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/google/status",
                headers={
                    "Host": "api.example.com",
                    "X-Forwarded-Proto": "ftp",
                    "X-Forwarded-For": "127.0.0.1",
                },
            )
        assert response.status_code == 400
    finally:
        config_module.settings.allowed_hosts_str = original_hosts
        config_module.settings.forwarded_allow_ips_str = original_forwarded
