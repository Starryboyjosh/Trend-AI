# WAVE-010A — Framework de fuentes de tendencias

## Objetivo

Crear contratos, persistencia, scoring y reglas de evidencia sin conectar todavía todas las APIs.

## Contexto del repositorio


La documentación antigua relegaba tendencias. La nueva beta las necesita, pero no deben bloquear el post textual.


## Alcance


- interfaces;
- models;
- migrations;
- fake sources;
- pipeline;
- scoring;
- capability integration.


## Inspección obligatoria

Antes de editar:


- nuevo dominio trends;
- scheduler/jobs existentes;
- business;
- capabilities;
- tests.


No asumas rutas adicionales. Localiza modelos, schemas, dependencias y tests relacionados.

## Secuencia de implementación


1. TrendSource.
2. Evidence.
3. Runs/items/scores.
4. Fake adapters.
5. Deterministic grouping.
6. Scoring versionado.
7. no-evidence rule.
8. API list/detail/refresh.


## Contratos


Cada tendencia requiere source URL, observed_at y region.


## Pruebas obligatorias


- no evidence;
- dedupe;
- scoring;
- partial sources;
- idempotent run;
- workspace relevance;
- E2E.


## Criterios de aceptación


- [ ] No fake trends.
- [ ] Evidencia persistida.
- [ ] Scoring reproducible.
- [ ] Sources degradables.


## Prohibiciones


- No scraping.
- No LLM como fuente.
- No TikTok/Instagram/X fake.


## Entrega del agente

1. Resumen.
2. Arquitectura encontrada.
3. Archivos modificados.
4. Migraciones y datos.
5. Contratos API/UI.
6. Seguridad.
7. Pruebas con resultados exactos.
8. Hallazgos.
9. Limitaciones.
10. Checklist marcado.



No hacer commit ni push. Dejar el working tree revisable.
