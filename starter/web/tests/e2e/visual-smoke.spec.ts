import { expect, test, type Page } from "@playwright/test";

const templates = [
  {
    id: "template-1",
    title: "Lanzamiento con impacto",
    platforms: ["instagram"],
    formats: ["static_post"],
    category: "launch",
    objective: "sales",
    thumbnail_url: "",
    editable_slots: ["headline"],
    description: "Presenta un producto con una idea visual clara.",
  },
  {
    id: "template-2",
    title: "Oferta de temporada",
    platforms: ["tiktok"],
    formats: ["short_video"],
    category: "promotion",
    objective: "sales",
    thumbnail_url: "",
    editable_slots: ["caption"],
    description: "Convierte una promoción en un video breve.",
  },
];

async function mockPrivateApi(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let body: unknown = {};

    if (path.endsWith("/auth/me")) {
      body = {
        user: { id: "user-1", name: "Ana", email: "ana@example.com" },
        workspaces: [{ id: "workspace-1", role: "owner" }],
      };
    } else if (path.endsWith("/businesses")) {
      body = [{ id: "business-1", name: "Café Aurora" }];
    } else if (path.endsWith("/projects")) {
      body = [
        {
          id: "project-1",
          name: "Campaña de verano",
          platform: "instagram",
          created_at: "2026-07-20T12:00:00Z",
        },
        {
          id: "project-2",
          name: "Menú de temporada",
          platform: "tiktok",
          created_at: "2026-07-19T12:00:00Z",
        },
      ];
    } else if (path.endsWith("/templates")) {
      body = templates;
    } else if (path.endsWith("/conversations")) {
      body = [{ id: "conversation-1", title: "Ideas para julio" }];
    } else if (path.endsWith("/conversations/conversation-1")) {
      body = { id: "conversation-1", messages: [] };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

test("login reproduce la composición visual de Figma", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "¡Bienvenido de vuelta!" })
  ).toBeVisible();
  await expect(
    page.getByAltText(
      "Computadora mostrando contenido creado para redes sociales"
    )
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" })
  ).toBeVisible();
});

test("inicio muestra el collage y los proyectos", async ({ page }) => {
  await mockPrivateApi(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Comienza a Crear" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Comenzar" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tus Proyectos" })
  ).toBeVisible();
  await expect(page.getByText("Campaña de verano")).toBeVisible();
});

test("plantillas usa contenido gráfico real y conserva filtros", async ({
  page,
}) => {
  await mockPrivateApi(page);
  await page.goto("/templates");
  await expect(
    page.getByRole("heading", { name: "Empieza a diseñar" })
  ).toBeVisible();
  await expect(page.getByLabel("Buscar plantillas")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lanzamiento con impacto" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /TikTok listos para editar/ })
  ).toBeVisible();
  await expect(
    page.getByAltText("Inspiración visual para video corto")
  ).toHaveCount(4);
});

test("asistente mantiene el estudio oscuro y el compositor", async ({
  page,
}) => {
  await mockPrivateApi(page);
  await page.goto("/assistant");
  await expect(
    page.getByRole("heading", { level: 1, name: "¿Qué quieres crear hoy?" })
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Mensaje" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar" })).toBeVisible();
});
