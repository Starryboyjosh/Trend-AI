# CLAUDE.md — HiTrendy Repository Guidance

Read `AGENTS.md` first. This repository is documentation-led and contract-first.

## Orientation

- Product: `docs/00-product/`
- Brand: `docs/01-brand/`
- UX: `docs/02-ux/`
- Architecture: `docs/03-architecture/`
- AI behavior: `docs/04-ai/`
- API contracts: `docs/05-api/` and `contracts/schemas/`
- Implementation plan: `docs/06-implementation/`

## Knowledge graph directive

When `graphify-out/GRAPH_REPORT.md` exists, read it before broad Glob/Grep operations. Use Graphify path queries to understand relationships among routes, services, schemas, prompts, and UI components.

## Product invariant

The main value is personalized creation assistance, not generic chat. A response is acceptable only when it uses the current business profile, objective, channel, tone, and user request.

## Architecture invariant

UI -> application service -> domain -> provider interface -> external model/storage.

Never reverse this dependency direction.
