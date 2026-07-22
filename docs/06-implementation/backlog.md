---
id: IMPL-BACKLOG-001
kind: backlog
status: proposed
---

# Backlog

## Estado de implementación — 2026-07-22

El MVP está aproximadamente al **96% funcional**. Están implementados y
verificados los flujos de perfil de negocio, autenticación y workspace,
generación de publicaciones y guiones cortos, variaciones, proyectos
versionados, plantillas, biblioteca de activos, revisión visual, historial de
conversaciones, voz en navegador, proveedores demo/intercambiables y medidas
base de seguridad y operación.

Pendiente antes de declarar el MVP terminado: instrumentar las señales de uso
restantes (copia, guardado y magnitud de edición), ampliar la cobertura de
accesibilidad a las demás rutas y ejecutar la revisión Graphify final. Los
intents no implementados se mantienen documentados como planeados y se rechazan
de forma explícita.

## Epic E1 — Foundation

- E1-T1 Initialize monorepo and quality scripts.
- E1-T2 Implement environment configuration validation.
- E1-T3 Add database and migration workflow.
- E1-T4 Add request IDs and structured logging. **Implemented:** responses and
  safe request metadata are correlated without logging bodies, query strings,
  authorization headers, or uploaded files.
- E1-T5 Implement branded application shell.

## Epic E2 — Account and onboarding

- E2-T1 Session authentication.
- E2-T2 Workspace and membership model.
- E2-T3 Business profile endpoints.
- E2-T4 Multi-step onboarding UI.
- E2-T5 Brand profile editing. **Implemented:** settings now edits business
  context and the validated brand profile used by generation.

## Epic E3 — Assistant

- E3-T1 Conversation CRUD. **Implementado.**
- E3-T2 Message composer and thread display. **Implementado:** incluye
  recuperación de artefactos y revisiones visuales al recargar una conversación,
  y conserva el borrador local de forma aislada por conversación.
- E3-T3 Intent classifier. **Implementado como intents explícitos de UI:** no se
  infiere ni reinterpreta una acción no disponible.
- E3-T4 Demo content provider. **Implementado.**
- E3-T5 Structured artifact rendering. **Implementado:** publicaciones, guiones
  cortos y revisiones visuales se renderizan con contratos tipados.
- E3-T6 Retry and error handling. **Implementado para contratos de generación y
  respuestas inválidas del proveedor.**

## Epic E4 — Projects

- E4-T1 Artifact versions. **Implementado.**
- E4-T2 Save project. **Implementado.**
- E4-T3 Project grid. **Implementado.**
- E4-T4 Project editor. **Implementado:** publicaciones y guiones de video.
- E4-T5 Archive and recovery. **Implementado.**

## Epic E5 — Templates

- E5-T1 Template model and seed. **Implementado.**
- E5-T2 Catalog UI. **Implementado.**
- E5-T3 Filters. **Implementado.**
- E5-T4 Recommendation service. **Implementado.**
- E5-T5 Start project from template. **Implementado:** crea un artefacto y una
  primera versión editables, con origen de plantilla trazable.

## Epic E6 — Library and visual review

- E6-T1 Secure object upload. **Implementado.**
- E6-T2 Asset listing. **Implementado.**
- E6-T3 Image preview. **Implementado.**
- E6-T4 Visual review schema and demo provider. **Implementado:** también desde
  el asistente mediante un adjunto autorizado.
- E6-T5 Vision-provider adapter. **Implemented:** demo and explicit
  OpenAI-compatible adapters preserve the validated `AssetAnalysis` contract.

## Epic E7 — AI quality

- E7-T1 Prompt registry. **Implementado.**
- E7-T2 Contract validation. **Implementado.**
- E7-T3 Deterministic evaluator. **Implementado:** comprueba plataforma, CTA,
  palabras prohibidas, precios/descuentos y garantías no sustentadas.
- E7-T4 Repair flow. **Implementado.**
- E7-T5 Scenario regression suite. **Implementado:** 30 escenarios
  versionados y deterministas cubren seis rubros y solicitudes directas, vagas y
  contradictorias sin requerir un proveedor externo.
- E7-T6 User feedback events. **Implementado:** la valoración `útil` / `no
  útil`, copia, guardado y magnitud de edición se persisten de forma autorizada
  sin almacenar el contenido del artefacto como telemetría.

## Epic E8 — Readiness

- E8-T1 Accessibility test pass. **Implementado para los flujos críticos:**
  foco visible, movimiento reducido, etiquetas de controles, estados anunciados
  y una comprobación automatizada axe del hilo del asistente.
- E8-T2 Security test pass. **Implementado:** pruebas negativas cubren sesión,
  workspace, cargas, encabezados, rotación de sesión y configuración de
  producción insegura.
- E8-T3 Rate limits. **Implementado:** autenticación y operaciones que invocan
  proveedores están limitadas; desarrollo usa un adaptador local y producción
  exige Redis compartido y disponible.
- E8-T4 Deployment runbook. **Implemented:** release sequence, smoke checks,
  secret boundaries, and provider/storage safeguards are documented.
- E8-T5 Demo reset and seed command. **Implemented:** `make demo-reset`
  recreates only the protected local demo database and seeds templates.
- E8-T6 Graphify generation and report review.
