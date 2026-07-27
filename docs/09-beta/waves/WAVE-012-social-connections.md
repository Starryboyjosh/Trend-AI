# WAVE-012 — Conexiones con redes propias

## Objetivo

Conectar cuentas profesionales autorizadas para métricas propias, sin convertirlo en scraping global.

## Contexto del repositorio


Instagram/TikTok/X tienen permisos y términos diferentes.


## Alcance


- OAuth/token vault;
- Instagram professional;
- X solo si pago;
- TikTok approved APIs;
- import own posts;
- revoke.


## Inspección obligatoria

Antes de editar:


- integrations;
- OAuth;
- storage secrets;
- analytics.


No asumas rutas adicionales. Localiza modelos, schemas, dependencias y tests relacionados.

## Secuencia de implementación


1. ADR por plataforma.
2. Tokens cifrados.
3. Scopes mínimos.
4. refresh/revoke.
5. own metrics.
6. capability status.
7. user disconnect/delete.


## Contratos


No usar conexiones sociales como registro principal.


## Pruebas obligatorias


- OAuth fakes;
- token rotation;
- revoke;
- isolation;
- unavailable platform.


## Criterios de aceptación


- [ ] Permisos.
- [ ] Tokens server-only.
- [ ] Revocación.
- [ ] No scraping.


## Prohibiciones


- No prometer TikTok trends.
- No X sin billing.
- No guardar token plano.


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
