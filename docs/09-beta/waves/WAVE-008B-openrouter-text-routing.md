# WAVE-008B — OpenRouter real para recomendaciones y texto

## Objetivo

Conectar OpenRouter mediante el provider existente y crear rutas fast/balanced/quality con control de costo.

## Contexto del repositorio


WAVE-001 ya creó provider OpenAI-compatible. No reescribirlo.


## Alcance


- adapter OpenRouter;
- model routes;
- free router;
- structured output;
- usage/cost;
- 402/429;
- fallback explícito.


## Inspección obligatoria

Antes de editar:


- provider content;
- factory;
- prompts/contracts;
- conversations;
- usage;
- capability registry.


No asumas rutas adicionales. Localiza modelos, schemas, dependencias y tests relacionados.

## Secuencia de implementación


1. Adaptar sin duplicar HTTP client.
2. Configurar rutas por capability/tier.
3. Catálogo cacheado.
4. Evaluaciones.
5. `openrouter/free` para fast zero-cost.
6. Desactivar paid fallback.
7. Registrar modelo real y costo.
8. Mapear 402/429.
9. Smoke opt-in.


## Contratos


Capacidades iniciales: advisor y copywriter. Respuestas Pydantic.


## Pruebas obligatorias


- fake provider;
- free route;
- paid disabled;
- structured JSON;
- multilingual;
- brand words;
- usage;
- smoke con bandera;
- E2E.


## Criterios de aceptación


- [ ] OpenRouter real responde.
- [ ] Fast funciona con ruta autorizada.
- [ ] No gasto no autorizado.
- [ ] Costos registrados.
- [ ] Errores claros.
- [ ] CI pasa.


## Prohibiciones


- No poner API key en frontend.
- No hardcodear modelos sin evaluación.
- No borrar provider fake.


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
