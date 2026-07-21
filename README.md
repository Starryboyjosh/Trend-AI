# HiTrendy — Implementation Foundation

> Web assistant for small businesses that creates social-media content using the business profile, brand identity, user assets, reusable templates, and an interchangeable pretrained LLM.

## Product decision

HiTrendy is intentionally **not** a large social-listening dashboard in its first release. The core experience is:

1. Learn the business through onboarding.
2. Let the user ask for a post, caption, campaign idea, rewrite, or visual critique.
3. Add the business profile and brand rules to the request.
4. Generate a useful, editable result with a pretrained LLM.
5. Save the result as a project or reusable asset.

Trend data can be added later as an optional skill. It must not block the MVP.

## What this package contains

- A coherent product and UX specification based on the supplied Figma screenshots.
- A complete brand system and implementation-ready design tokens.
- Backend, frontend, data, AI, security, and deployment architecture.
- Agent-ready implementation instructions and acceptance criteria.
- Machine-readable JSON schemas and prompt contracts.
- A runnable offline demo with FastAPI and a zero-dependency web interface.
- A production-oriented starter structure for Next.js and FastAPI.
- Graphify-oriented documentation, IDs, relationships, and traversal guidance.

## Repository map

```text
hitrendy_foundation/
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── project-manifest.yaml
├── .env.example
├── docker-compose.yml
├── docs/
│   ├── INDEX.md
│   ├── 00-product/
│   ├── 01-brand/
│   ├── 02-ux/
│   ├── 03-architecture/
│   ├── 04-ai/
│   ├── 05-api/
│   ├── 06-implementation/
│   ├── 07-demo/
│   ├── 08-references/
│   └── diagrams/
├── design/
├── contracts/
├── starter/
│   ├── backend/
│   └── web/
├── demo/
└── references/figma/
```

## Fastest way to see the concept

```bash
cd demo
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

Open `http://127.0.0.1:8000`.

The demo works without external APIs. It uses deterministic example generation so the product flow can be evaluated before connecting a real model.

## Recommended implementation order

1. Read `docs/INDEX.md`.
2. Implement the vertical slice in `docs/06-implementation/agentic-playbook.md`.
3. Reuse the contracts under `contracts/schemas/`.
4. Preserve the tokens in `design/tokens.css`.
5. Validate each milestone against `docs/07-demo/acceptance.md`.
6. Run Graphify after the first working slice and after structural changes.

## MVP success condition

A new user can complete onboarding, request a social-media post, receive a structured result personalized to the business, edit it, and save it as a project in under five minutes.

## Non-goals for MVP

- Automatic publishing to social networks.
- Universal TikTok, Instagram, or X scraping.
- Training a foundation model from scratch.
- Continuous model fine-tuning on user data.
- Full Canva-style freeform design editor.
- Complex trend analytics dashboard.

## Source of truth hierarchy

When documents conflict, use this order:

1. `contracts/schemas/`
2. Accepted ADRs in `docs/03-architecture/adr/`
3. `docs/06-implementation/agentic-playbook.md`
4. Domain specifications under `docs/`
5. Starter code
6. Demo code

The demo is a product illustration, not the production architecture.
