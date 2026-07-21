---
id: AI-EVAL-001
kind: quality_spec
status: accepted
related: [NFR-002]
---

# AI evaluation

## Evaluation layers

### 1. Contract validation

- Valid JSON.
- Required fields present.
- Enum values valid.
- Length limits respected.

### 2. Deterministic checks

- Requested platform matches output.
- No more than configured hashtag limit.
- CTA present when objective requires it.
- No invented price/date/location when not supplied.
- Forbidden brand words absent.

### 3. Rubric evaluation

Score 0–2 per category:

- business relevance,
- audience fit,
- tone fit,
- clarity,
- actionability,
- platform suitability,
- factual restraint.

Minimum release threshold: 11/14 with no factual-restraint failure.

### 4. Human evaluation set

Maintain at least 30 representative scenarios across:

- gastronomy,
- fashion,
- health/wellness without medical claims,
- art/creator,
- services,
- retail.

Include short, vague, and contradictory prompts.

## Regression record

For every prompt/model change, record:

- model/provider,
- prompt version,
- schema version,
- scenario set version,
- pass rate,
- latency,
- estimated cost,
- notable failures.

## User feedback

Collect simple signals:

- useful / not useful,
- copied,
- saved,
- edited amount,
- reason for reporting.

Do not treat engagement with generated content as proof of business results.
