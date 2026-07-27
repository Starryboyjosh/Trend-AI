# WAVE-009 — Configuración, idiomas, uso y eliminación

## Objetivo

Completar Configuración con cuenta, negocio, marca, idiomas, uso, privacidad y eliminación.

## Contexto del repositorio


Settings actual edita solo negocio y marca parcial.


## Alcance


- tabs/subroutes;
- es/en/pt;
- content locale;
- account;
- usage;
- privacy;
- delete;
- admin reset CLI.


## Inspección obligatoria

Antes de editar:


- settings page/components;
- i18n setup;
- identity/business;
- usage;
- storage deletion;
- tests.


No asumas rutas adicionales. Localiza modelos, schemas, dependencias y tests relacionados.

## Secuencia de implementación


1. Elegir librería i18n coherente.
2. Extraer strings principales.
3. Persistir locale.
4. Completar negocio/marca.
5. Uso soft.
6. CLI admin auditada.
7. Delete 202 + purge.
8. Revocar sessions.


## Contratos


La eliminación es inmediata para acceso, asíncrona para purga.


## Pruebas obligatorias


- 3 idiomas;
- content locale;
- usage;
- reset admin;
- non-admin;
- deletion;
- storage purge fake;
- E2E.


## Criterios de aceptación


- [ ] Settings completas.
- [ ] 3 idiomas.
- [ ] Uso visible.
- [ ] Reset auditado.
- [ ] Cuenta eliminada no entra.
- [ ] CI.


## Prohibiciones


- No comando secreto.
- No traducción automática en runtime.
- No ocultar fallos de purga.


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
