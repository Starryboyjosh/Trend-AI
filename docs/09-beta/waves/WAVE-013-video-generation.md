# WAVE-013 — Video asíncrono

## Objetivo

Generar clips verticales con límites estrictos después de cerrar imagen y costos.

## Contexto del repositorio


Video es prioridad cuatro y normalmente pagado.


## Alcance


- script/storyboard fallback;
- video adapter;
- async jobs;
- polling/webhook;
- storage;
- limits.


## Inspección obligatoria

Antes de editar:


- generation jobs;
- capabilities;
- usage;
- storage;
- UI.


No asumas rutas adicionales. Localiza modelos, schemas, dependencias y tests relacionados.

## Secuencia de implementación


1. Route approved.
2. cost preflight.
3. submit.
4. poll.
5. timeout.
6. persist.
7. cancel if provider supports.
8. fallback storyboard.


## Contratos


Estados queued/processing/completed/failed/cancelled.


## Pruebas obligatorias


- fake async;
- polling;
- duplicate;
- cost;
- timeout;
- storage;
- disabled.


## Criterios de aceptación


- [ ] No unlimited spend.
- [ ] Async state.
- [ ] Fallback.
- [ ] Usage.


## Prohibiciones


- No habilitar en zero-cost.
- No polling infinito.


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
