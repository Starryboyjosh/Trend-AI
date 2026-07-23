---
id: IMPL-ERROR-PLAN-001
kind: implementation-plan
status: in_progress
owner: frontend
updated: 2026-07-22
---

# Plan de resolución de errores frontend

## Objetivo de la entrega inmediata

Dejar un recorrido demostrable y estable para mañana:

`Home -> Login/demo -> Studio -> generar/guardar contenido -> Dashboard`.

El backend ya dispone de contratos para autenticación, conversaciones,
proyectos, plantillas, assets y revisión visual. No se debe sustituir esa
arquitectura ni inventar una API paralela.

## P0 — bloquear antes de la entrega

### 1. Logout contra API real

`POST /api/v1/auth/logout` responde `204 No Content`, pero el cliente web intenta
parsear JSON para toda respuesta exitosa. Ajustar el cliente para devolver
`undefined` en `204` y comprobar que el App Shell limpia sesión y vuelve a Home.

**Aceptación:** login real, logout real y segundo acceso sin sesión no producen
errores de parsing ni dejan datos privados visibles.

### 2. Crear proyecto desde plantilla

La biblioteca web guarda el ID de plantilla y abre Studio, pero el flujo de
producto exige crear un proyecto editable mediante `POST /projects` con
`template_id`, y luego abrir la conversación asociada.

**Aceptación:** `Usar plantilla` crea un proyecto persistente, muestra su primer
artefacto editable y aparece en Dashboard después de recargar.

### 3. Miniaturas de plantillas seed

El seed backend referencia `/static/thumbnails/*.svg`, mientras que esos paths
no están disponibles en el servidor web integrado. Mapear los IDs a assets
locales existentes o servirlos desde un endpoint estable; no dejar URLs rotas.

**Aceptación:** cada tarjeta muestra imagen válida en API real, demo y build de
producción, con estado alternativo accesible si falta un asset.

## P1 — completar si queda tiempo

- Ejecutar y estabilizar el smoke E2E en Chromium para Home, login/demo, Studio,
  Dashboard, búsqueda/filtros y Settings.
- Añadir estados de error visibles para fallos de API en generación, proyectos y
  plantillas, manteniendo el modo demo operativo.
- Verificar `prefers-reduced-motion`, foco y contraste en rutas nuevas.
- Actualizar la evidencia de aceptación y el inventario de assets con URLs
  reales usadas por la aplicación.

## P2 — después de la entrega

- Idempotency keys en mutaciones web.
- Búsqueda/paginación de plantillas desde servidor cuando el catálogo crezca.
- Instrumentación adicional de uso sin almacenar contenido sensible.
- Revisión Graphify y comparación visual final con Figma.

## Fuera de alcance para mañana

El roadmap y `AGENTS.md` mantienen el análisis de tendencias en tiempo real fuera
del MVP. No se debe presentar como implementado ni consumir fuentes externas sin
contrato, autorización y pruebas. Primero se entrega la creación y persistencia
de contenido; `trend_context` puede añadirse después como proveedor opcional.

## Checklist de cierre

- [ ] P0.1 logout `204` corregido y probado.
- [ ] P0.2 plantilla crea proyecto persistente.
- [ ] P0.3 miniaturas seed sin rutas rotas.
- [x] Typecheck, lint, pruebas unitarias y build frontend pasan.
- [x] Suite backend pasa.
- [ ] E2E Chromium estable y documentado.
