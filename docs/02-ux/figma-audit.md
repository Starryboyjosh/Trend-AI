---
id: UX-FIGMA-001
kind: ux_audit
status: accepted
inputs:
  - references/figma/01-validation-survey.png
  - references/figma/02-chat-concepts.png
  - references/figma/03-chat-generation.png
  - references/figma/04-chat-review.png
  - references/figma/05-settings-library.png
  - references/figma/06-login.png
  - references/figma/07-home-projects.png
  - references/figma/08-templates-landing.png
---

# Figma audit and implementation alignment

## Overall assessment

The supplied Figma is coherent as an early product concept. It defines a recognizable brand and a clear central idea: HiTrendy is a conversational assistant that helps a business create and improve promotional content.

The implementation should preserve that direction instead of expanding into a complex trend analytics dashboard.

## What is already strong

- Memorable hand mascot and wordmark.
- Consistent dark indigo and violet identity.
- Login screen with clear visual hierarchy.
- Chat-centered product concept.
- Templates, projects, library, and uploaded-content ideas.
- Onboarding questions that can become business context.
- Visible path from asking for help to receiving copy or critique.

## What needs normalization before coding

### 1. Navigation semantics

The screenshots show icon-only sidebars with slightly different icon sets. Define one stable navigation model and use tooltips plus an expandable desktop label.

### 2. Screen hierarchy

Several frames combine exploration, assistant, and content editing. The production app needs explicit routes so back behavior, deep links, and permissions remain predictable.

### 3. Component consistency

Gray placeholder rectangles must become typed components: message card, asset preview, result card, template card, comparison panel, and empty state.

### 4. State design

The Figma does not fully show loading, streaming, validation errors, upload progress, provider failures, empty library, or saved confirmation. These states are specified elsewhere in this package.

### 5. Survey versus onboarding

The “Encuesta de validación” is research material. The final product should reuse the useful questions but rename and restructure the flow as “Configura tu negocio”.

### 6. Home screen

The current hero is visually strong but functionally sparse. Keep the visual composition and add:

- quick actions,
- recent project,
- suggested prompt,
- profile completion indicator.

Do not add a dense analytics dashboard.

## Recommended route mapping from Figma

| Figma concept | Production route | Notes |
|---|---|---|
| Login | `/login` | Preserve split visual layout |
| Validation survey | `/onboarding` | Convert to multi-step business setup |
| Main HiTrendy chat | `/assistant` | Core product route |
| Search conversations | `/conversations` | Filter and reopen threads |
| Templates | `/templates` | Browse and start project |
| Library | `/library` | User assets and generated outputs |
| Project folders | `/projects` | Recent and archived projects |
| Settings/account | `/settings` | Profile, brand, model/privacy settings |
| Marketing landing | `/` | Public landing, not app shell |

## Recommended demo emphasis

The strongest fair demo is not the landing page. It is this product loop:

```text
Onboarding -> Assistant -> Structured result -> Variation -> Save project -> Visual feedback
```

## Visual cleanup rules

- Use one desktop frame width and responsive constraints.
- Keep a single sidebar location.
- Align main content to a consistent grid.
- Use meaningful thumbnails instead of generic gray blocks in the final demo.
- Do not fill the interface with decorative shapes where they compete with content.
- Keep the brand mascot large on marketing pages and smaller inside the app.
