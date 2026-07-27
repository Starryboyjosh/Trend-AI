# WAVE-008C — Post de Instagram en cinco minutos

## Objetivo

Completar el primer flujo de valor de la beta: cuenta configurada → recomendación → post editable y guardado.

## Contexto del repositorio


Negocio, marca, templates, conversaciones y artefactos ya existen.


## Alcance


- home simple;
- CTA crear;
- wizard/post chat;
- output estructurado;
- visual brief;
- edición;
- guardado;
- recuperación.


## Inspección obligatoria

Antes de editar:


- dashboard/home;
- studio workspace;
- templates;
- conversations;
- artifacts/projects;
- prompts.


No asumas rutas adicionales. Localiza modelos, schemas, dependencias y tests relacionados.

## Secuencia de implementación


1. Seleccionar template Instagram.
2. Precargar contexto.
3. Pedir objetivo/tema.
4. Elegir nivel.
5. Generar recommendation/post.
6. Mostrar caption, CTA, hashtags y visual brief.
7. Editar.
8. Guardar.
9. Duplicar/variar.
10. Instrumentar tiempo hasta valor.


## Contratos


Formato inicial 4:5. No requiere imagen real.


## Pruebas obligatorias


- usuario nuevo E2E;
- contexto de marca;
- forbidden words;
- guardar/recargar;
- idempotencia;
- responsive;
- i18n keys;
- CI.


## Criterios de aceptación


- [ ] Usuario nuevo logra el post.
- [ ] Menos de cinco minutos en prueba manual.
- [ ] Resultado editable.
- [ ] Persistente.
- [ ] Provider real.


## Prohibiciones


- No bloquear por tendencias.
- No prometer imagen.
- No rediseño masivo.


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
