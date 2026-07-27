# WAVE-010B — YouTube, búsqueda y RSS

## Objetivo

Conectar las primeras fuentes compatibles con presupuesto cero o muy bajo.

## Contexto del repositorio


Prioridad de usuario: Google, YouTube, TikTok, Instagram, noticias, Reddit, local. Solo se conectan fuentes legal/técnicamente disponibles.


## Alcance


- YouTube;
- SerpApi;
- RSS allowlist;
- quotas;
- cache;
- source availability.


## Inspección obligatoria

Antes de editar:


- trends adapters;
- config;
- capabilities;
- usage;
- docs.


No asumas rutas adicionales. Localiza modelos, schemas, dependencias y tests relacionados.

## Secuencia de implementación


1. YouTube key y quota budget.
2. SerpApi 250/month budget.
3. RSS allowlist.
4. Normalizar.
5. Cache.
6. mensajes quota.
7. atribución.
8. deshabilitar GNews comercial free.


## Contratos


No habilitar sources restricted en producción.


## Pruebas obligatorias


- fixtures;
- quota;
- malformed feed;
- timeout;
- partial run;
- evidence.


## Criterios de aceptación


- [ ] YouTube.
- [ ] Search.
- [ ] RSS.
- [ ] Quotas.
- [ ] Honest UI.


## Prohibiciones


- No usar GNews Free comercial.
- No Reddit comercial sin aprobación.
- No TikTok Research API.


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
