---
id: API-PROVIDERS-001
kind: architecture_spec
status: accepted
related: [NFR-003]
---

# Provider interfaces

## Content model provider

```python
class ContentModelProvider(Protocol):
    provider_name: str
    model_name: str

    async def generate_social_post(
        self, *, request: SocialPostModelRequest
    ) -> dict: ...

    async def repair_social_post(
        self, *, request: SocialPostModelRequest,
        invalid_output: dict, errors: list[str]
    ) -> dict: ...
```

The provider returns untrusted dictionaries. The application validates them.

## Provider implementations

- `DemoContentProvider`: deterministic and offline for development/tests.
- `OpenAICompatibleProvider`: implemented through `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`.
- `OllamaProvider`: planned local-model adapter.
- Additional cloud providers may be added without changing domain services.

Providers receive a bounded `SocialPostModelRequest`, never a database session, user session, tool registry, or raw conversation history. They return untrusted dictionaries; the application validates, evaluates, repairs once when needed, and persists only the final artifact.

## Object storage provider

```python
class ObjectStorageProvider(Protocol):
    async def put(self, *, key: str, content: bytes, content_type: str) -> None: ...
    async def read(self, *, key: str) -> bytes: ...
    async def delete(self, *, key: str) -> None: ...
```

The application generates opaque workspace-scoped keys and authorizes every
content read before calling the provider. `LocalObjectStorageProvider` is for
development only; production uses the `s3` adapter configured through the
object-storage environment variables. A future direct-upload implementation
may add signed upload targets without exposing permanent read URLs.

## Template catalog provider

MVP uses internal database records and local/static previews. A future remote catalog must map into the same internal `Template` contract.

## Authentication provider

Authentication may be self-managed or delegated, but application authorization remains internal. External identity IDs must map to HiTrendy user and workspace records.
