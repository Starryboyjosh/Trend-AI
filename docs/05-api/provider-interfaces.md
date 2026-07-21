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
    async def generate_social_post(
        self, request: SocialPostModelRequest
    ) -> dict: ...

    async def generate_short_video_script(
        self, request: VideoScriptModelRequest
    ) -> dict: ...

    async def rewrite_artifact(
        self, request: RewriteModelRequest
    ) -> dict: ...

    async def analyze_visual(
        self, request: VisualAnalysisModelRequest
    ) -> dict: ...
```

The provider returns untrusted dictionaries. The application validates them.

## Provider implementations

- `DemoContentProvider`: deterministic and offline.
- `OpenAICompatibleProvider`: works with a configured compatible endpoint.
- `OllamaProvider`: local model connection.
- Additional cloud providers may be added without changing domain services.

## Object storage provider

```python
class ObjectStorageProvider(Protocol):
    async def create_upload(self, key: str, content_type: str) -> UploadTarget: ...
    async def create_read_url(self, key: str, expires_seconds: int) -> str: ...
    async def delete(self, key: str) -> None: ...
```

## Template catalog provider

MVP uses internal database records and local/static previews. A future remote catalog must map into the same internal `Template` contract.

## Authentication provider

Authentication may be self-managed or delegated, but application authorization remains internal. External identity IDs must map to HiTrendy user and workspace records.
