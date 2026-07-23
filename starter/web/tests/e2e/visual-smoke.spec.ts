import { expect, test, type Page } from "@playwright/test";

const templates = [
  {
    id: "template-demo-1",
    title: "Promoción floral",
    platforms: ["instagram"],
    formats: ["static_post"],
    category: "Posts",
    objective: "sales",
    thumbnail_url: "/templates/flores.png",
    editable_slots: ["titulo"],
    description: null,
  },
  {
    id: "template-demo-2",
    title: "Reel de lanzamiento",
    platforms: ["instagram"],
    formats: ["reel"],
    category: "Reels",
    objective: "launch",
    thumbnail_url: "/templates/video-mar.png",
    editable_slots: ["hook"],
    description: null,
  },
  {
    id: "template-demo-4",
    title: "Oferta de temporada",
    platforms: ["instagram"],
    formats: ["static_post"],
    category: "Anuncios",
    objective: "sales",
    thumbnail_url: "/templates/amor.png",
    editable_slots: ["titulo"],
    description: null,
  },
];

async function mockPrivateApi(page: Page, projects: unknown[] = []) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    let body: unknown = {};

    if (path.endsWith("/auth/me")) {
      body = {
        user: { id: "user-1", name: "Ana", email: "ana@example.com" },
        workspaces: [{ id: "workspace-1", role: "owner" }],
      };
    } else if (path.endsWith("/projects") && method === "GET") {
      body = projects;
    } else if (path.endsWith("/projects") && method === "POST") {
      body = {
        id: "project-template-1",
        name: "Promoción floral",
        platform: "instagram",
        status: "active",
        artifact_id: "artifact-template-1",
        source_template_id: "template-demo-1",
        artifact_snapshot: {
          artifact_type: "social_post",
          platform: "instagram",
          hook: "Promoción floral",
          caption: "Texto editable",
          call_to_action: "Escríbenos",
          hashtags: [],
          visual_direction: "Producto destacado",
          format_recommendation: "static_post",
          assumptions: [],
        },
      };
    } else if (path.includes("/projects/project-template-1/versions")) {
      body = [];
    } else if (path.includes("/projects/project-template-1")) {
      body = {
        id: "project-template-1",
        name: "Promoción floral",
        platform: "instagram",
        status: "active",
        artifact_snapshot: {
          artifact_type: "social_post",
          platform: "instagram",
          hook: "Promoción floral",
          caption: "Texto editable",
          call_to_action: "Escríbenos",
          hashtags: [],
          visual_direction: "Producto destacado",
          format_recommendation: "static_post",
          assumptions: [],
        },
      };
    } else if (path.endsWith("/templates")) {
      body = templates;
    } else if (path.endsWith("/conversations")) {
      body = [];
    } else if (path.endsWith("/businesses")) {
      body = [
        {
          id: "business-1",
          name: "Café Central",
          description: "Café de barrio",
          primary_product: "Café de especialidad",
          target_audience: "Personas que trabajan cerca",
        },
      ];
    } else if (path.endsWith("/brand-profile")) {
      body = {
        voice_tones: ["friendly"],
        value_proposition: "Café cercano",
        preferred_words: [],
        forbidden_words: [],
        primary_color: "#541787",
        secondary_color: "#B79CFA",
      };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

test("el Home público conserva el prompt antes de ir al login", async ({
  page,
}) => {
  await mockPrivateApi(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Comienza a crear/ })
  ).toBeVisible();
  await page
    .getByLabel("Describe qué quieres crear para tu negocio")
    .fill("Quiero lanzar mi cafetería");
  await page.getByRole("button", { name: /Comenzar/ }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fstudio%2Fnew$/);
  await expect(page.getByText("Tus proyectos")).toHaveCount(0);
});

test("Templates filtra por búsqueda y categoría", async ({ page }) => {
  await mockPrivateApi(page);
  await page.goto("/templates");
  await expect(
    page.getByRole("heading", { name: "Explora plantillas" })
  ).toBeVisible();
  await page.getByLabel("Buscar plantillas").fill("floral");
  await expect(page.getByText("Promoción floral")).toBeVisible();
  await expect(page.getByText("Reel de lanzamiento")).toHaveCount(0);
  await page.getByLabel("Buscar plantillas").fill("café");
  await page.getByRole("button", { name: "Anuncios" }).click();
  await expect(page.getByText("No encontramos plantillas")).toBeVisible();
});

test("Usar plantilla crea el proyecto persistente y abre su editor", async ({
  page,
}) => {
  let createPayload: unknown;
  await mockPrivateApi(page);
  await page.route("**/api/v1/projects", async (route) => {
    if (route.request().method() === "POST") {
      createPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "project-template-1",
          artifact_id: "artifact-template-1",
          source_template_id: "template-demo-1",
        }),
      });
      return;
    }
    await route.fallback();
  });

  await page.goto("/templates");
  await page
    .getByRole("article")
    .filter({ hasText: "Promoción floral" })
    .getByRole("button", { name: "Usar plantilla" })
    .click();

  await expect(page).toHaveURL(/\/projects\/project-template-1$/);
  await expect(
    page.getByRole("heading", { name: "Promoción floral" })
  ).toBeVisible();
  expect(createPayload).toEqual({
    template_id: "template-demo-1",
    business_id: "business-1",
  });
});

test("Dashboard muestra un estado vacío que permite continuar", async ({
  page,
}) => {
  await mockPrivateApi(page);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Tu espacio creativo" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Comenzar a crear" }).first()
  ).toHaveAttribute("href", "/templates");
});

test("Configuración conserva el formulario de negocio y marca", async ({
  page,
}) => {
  await mockPrivateApi(page);
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Configuración" })
  ).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveValue("Café Central");
  await expect(
    page.getByRole("button", { name: "Guardar cambios" })
  ).toBeVisible();
});

test("Studio reúne el estado vacío y la creación de conversaciones", async ({
  page,
}, testInfo) => {
  await mockPrivateApi(page);
  await page.goto("/studio/new");
  await expect(
    page.getByRole("heading", { name: /¿Qué haremos hoy\?/ })
  ).toBeVisible();
  if (testInfo.project.name.includes("mobile")) {
    await expect(
      page.getByRole("button", { name: "Crear una publicación" })
    ).toBeVisible();
    return;
  }
  await expect(
    page.getByRole("button", { name: "Nueva creación" })
  ).toBeVisible();
  await expect(page.getByLabel("Buscar conversaciones")).toBeVisible();
});

test("Login conserva un destino interno seguro", async ({ page }) => {
  await mockPrivateApi(page);
  await page.goto("/login?next=/templates");
  await page.getByLabel("Correo electrónico").fill("ana@example.com");
  await page.getByLabel("Contraseña").fill("demostracion");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/templates$/);
});

test("Login permite entrar en modo demo sin credenciales", async ({ page }) => {
  await page.goto("/login?next=/dashboard");
  await page.getByRole("button", { name: "Entrar en modo demo" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("logout invalida la sesión y bloquea de nuevo las rutas privadas", async ({
  page,
}) => {
  let authenticated = true;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/logout")) {
      authenticated = false;
      await route.fulfill({ status: 204 });
      return;
    }
    if (path.endsWith("/auth/me")) {
      await route.fulfill({
        status: authenticated ? 200 : 401,
        contentType: "application/json",
        body: JSON.stringify(
          authenticated
            ? {
                user: { id: "user-1", name: "Ana", email: "ana@example.com" },
                workspaces: [{ id: "workspace-1", role: "owner" }],
              }
            : {
                error: { code: "UNAUTHENTICATED", message: "Sesión requerida" },
              }
        ),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: /Cerrar sesión|Salir/ }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/templates");
  await expect(page).toHaveURL(/\/login\?next=%2Ftemplates$/);
});

test("una ruta protegida conserva el destino al pedir inicio de sesión", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/me", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "UNAUTHENTICATED", message: "Sesión requerida" },
      }),
    });
  });
  await page.goto("/templates");
  await expect(page).toHaveURL(/\/login\?next=%2Ftemplates$/);
});

test("Login rechaza un destino externo", async ({ page }) => {
  await mockPrivateApi(page);
  await page.goto("/login?next=https://example.com");
  await page.getByLabel("Correo electrónico").fill("ana@example.com");
  await page.getByLabel("Contraseña").fill("demostracion");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
