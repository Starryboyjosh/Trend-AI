from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Protocol

from app.core.config import settings
from app.core.errors import AppError


class ObjectStorageProvider(Protocol):
    async def put(self, *, key: str, content: bytes, content_type: str) -> None: ...

    async def read(self, *, key: str) -> bytes: ...

    async def delete(self, *, key: str) -> None: ...


class LocalObjectStorageProvider:
    """Filesystem adapter for local development; keys are server-generated opaque paths."""

    def __init__(self, root: str) -> None:
        self._root = Path(root).resolve()

    def _path_for(self, key: str) -> Path:
        path = (self._root / key).resolve()
        if self._root not in path.parents:
            raise ValueError("Invalid object storage key")
        return path

    async def put(self, *, key: str, content: bytes, content_type: str) -> None:
        path = self._path_for(key)
        await asyncio.to_thread(path.parent.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(path.write_bytes, content)

    async def read(self, *, key: str) -> bytes:
        path = self._path_for(key)
        try:
            return await asyncio.to_thread(path.read_bytes)
        except FileNotFoundError as exc:
            raise AppError(
                "ASSET_UNAVAILABLE", "El activo ya no está disponible.", status_code=404
            ) from exc

    async def delete(self, *, key: str) -> None:
        path = self._path_for(key)
        await asyncio.to_thread(path.unlink, missing_ok=True)


class S3ObjectStorageProvider:
    def __init__(self, *, endpoint: str, access_key: str, secret_key: str, bucket: str) -> None:
        try:
            import boto3
        except ImportError as exc:  # pragma: no cover - dependency configuration error
            raise AppError(
                "OBJECT_STORAGE_UNAVAILABLE",
                "La configuración de almacenamiento no está disponible.",
                status_code=503,
            ) from exc
        self._bucket = bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

    async def put(self, *, key: str, content: bytes, content_type: str) -> None:
        await asyncio.to_thread(
            self._client.put_object,
            Bucket=self._bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
        )

    async def read(self, *, key: str) -> bytes:
        try:
            response = await asyncio.to_thread(
                self._client.get_object, Bucket=self._bucket, Key=key
            )
            return await asyncio.to_thread(response["Body"].read)
        except Exception as exc:  # Provider-specific exceptions stay outside the domain.
            raise AppError(
                "ASSET_UNAVAILABLE", "El activo ya no está disponible.", status_code=404
            ) from exc

    async def delete(self, *, key: str) -> None:
        await asyncio.to_thread(self._client.delete_object, Bucket=self._bucket, Key=key)


def get_object_storage_provider() -> ObjectStorageProvider:
    if settings.object_storage_provider == "local":
        if settings.app_env == "production":
            raise AppError(
                "OBJECT_STORAGE_UNAVAILABLE",
                "La configuración de almacenamiento no está disponible.",
                status_code=503,
            )
        return LocalObjectStorageProvider(settings.object_storage_local_dir)
    if settings.object_storage_provider == "s3":
        if not all(
            [
                settings.object_storage_endpoint,
                settings.object_storage_access_key,
                settings.object_storage_secret_key,
                settings.object_storage_bucket,
            ]
        ):
            raise AppError(
                "OBJECT_STORAGE_UNAVAILABLE",
                "La configuración de almacenamiento no está disponible.",
                status_code=503,
            )
        return S3ObjectStorageProvider(
            endpoint=settings.object_storage_endpoint,
            access_key=settings.object_storage_access_key,
            secret_key=settings.object_storage_secret_key,
            bucket=settings.object_storage_bucket,
        )
    raise AppError(
        "OBJECT_STORAGE_UNAVAILABLE",
        "El proveedor de almacenamiento configurado no está disponible.",
        status_code=503,
    )
