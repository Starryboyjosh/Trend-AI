import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  ApiError,
  api,
  createIdempotencyKey,
  resetCsrfToken,
} from "@/lib/api";

vi.mock("@/lib/demo-mode", () => ({
  isDemoModeEnabled: vi.fn(() => false),
  readDemoProjects: vi.fn((projects: unknown) => projects),
  saveDemoProjects: vi.fn(),
}));

type FetchMock = ReturnType<typeof vi.fn>;

const fetchMock = vi.fn() as FetchMock;

function jsonResponse(
  body: unknown,
  init: ResponseInit = {}
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function errorResponse(
  code: string,
  status = 403,
  retryable = false,
  headers?: HeadersInit
): Response {
  return jsonResponse(
    {
      error: {
        code,
        message: code,
        retryable,
      },
    },
    { status, headers }
  );
}

function requestInitAt(index: number): RequestInit {
  const call = fetchMock.mock.calls[index];
  expect(call).toBeDefined();
  return (call?.[1] ?? {}) as RequestInit;
}

function requestHeadersAt(index: number): Headers {
  return new Headers(requestInitAt(index).headers);
}

beforeEach(() => {
  resetCsrfToken();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("API client", () => {
  test("crea claves de idempotencia no vacías", () => {
    const first = createIdempotencyKey();
    const second = createIdempotencyKey();

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });

  test("una petición GET no solicita token CSRF", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await api.projects.list();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/projects");
  });

  test("obtiene CSRF con credentials include y cache no-store", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-one" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-1" }));

    await api.projects.create({ name: "Proyecto" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/auth/csrf");
    expect(requestInitAt(0)).toMatchObject({
      credentials: "include",
      cache: "no-store",
    });
  });

  test("adjunta X-CSRF-Token en mutaciones", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-one" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-1" }));

    await api.projects.create({ name: "Proyecto" });

    expect(requestHeadersAt(1).get("X-CSRF-Token")).toBe("csrf-one");
    expect(requestInitAt(1).credentials).toBe("include");
  });

  test("mantiene el token CSRF únicamente en memoria", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-memory" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-1" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-2" }));

    await api.projects.create({ name: "Uno" });
    await api.projects.create({ name: "Dos" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  test("resetCsrfToken obliga a obtener un token nuevo", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-one" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-1" }))
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-two" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-2" }));

    await api.projects.create({ name: "Uno" });
    resetCsrfToken();
    await api.projects.create({ name: "Dos" });

    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/v1/auth/csrf");
    expect(requestHeadersAt(3).get("X-CSRF-Token")).toBe("csrf-two");
  });

  test("reintenta una vez un error CSRF aunque maxAttempts sea 1", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-old" }))
      .mockResolvedValueOnce(errorResponse("CSRF_TOKEN_INVALID"))
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-new" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await api.conversations.sendMessage(
      "conversation-1",
      "Hola",
      undefined,
      [],
      { maxAttempts: 1 }
    );

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(requestHeadersAt(1).get("X-CSRF-Token")).toBe("csrf-old");
    expect(requestHeadersAt(3).get("X-CSRF-Token")).toBe("csrf-new");
  });

  test("no entra en bucle ante un segundo error CSRF", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-old" }))
      .mockResolvedValueOnce(errorResponse("CSRF_TOKEN_INVALID"))
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-new" }))
      .mockResolvedValueOnce(errorResponse("CSRF_TOKEN_INVALID"));

    await expect(
      api.conversations.sendMessage(
        "conversation-1",
        "Hola",
        undefined,
        [],
        { maxAttempts: 1 }
      )
    ).rejects.toMatchObject({
      status: 403,
      code: "CSRF_TOKEN_INVALID",
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test("elimina el header CSRF anterior antes del refresco", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-stale" }))
      .mockResolvedValueOnce(errorResponse("CSRF_TOKEN_MISMATCH"))
      .mockResolvedValueOnce(jsonResponse({ token: null }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await api.projects.create({ name: "Proyecto" });

    expect(requestHeadersAt(1).get("X-CSRF-Token")).toBe("csrf-stale");
    expect(requestHeadersAt(3).has("X-CSRF-Token")).toBe(false);
  });

  test("agrega Content-Type JSON cuando el body es texto", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-one" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-1" }));

    await api.projects.create({ name: "Proyecto" });

    expect(requestHeadersAt(1).get("Content-Type")).toBe("application/json");
  });

  test("no agrega Content-Type a una petición GET sin body", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await api.projects.list();

    expect(requestHeadersAt(0).has("Content-Type")).toBe(false);
  });

  test("envía Idempotency-Key y reintenta respuestas retryable", async () => {
    const onRetry = vi.fn();

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-one" }))
      .mockResolvedValueOnce(
        errorResponse("TEMPORARY", 503, true, { "Retry-After": "0" })
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await api.conversations.sendMessage(
      "conversation-1",
      "Hola",
      undefined,
      [],
      {
        idempotencyKey: "idem-1",
        maxAttempts: 2,
        onRetry,
      }
    );

    expect(result).toEqual({ ok: true });
    expect(requestHeadersAt(1).get("Idempotency-Key")).toBe("idem-1");
    expect(requestHeadersAt(2).get("Idempotency-Key")).toBe("idem-1");
    expect(onRetry).toHaveBeenCalledWith(2);
  });

  test("no reintenta errores retryable sin clave de idempotencia", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-one" }))
      .mockResolvedValueOnce(errorResponse("TEMPORARY", 503, true));

    await expect(
      api.projects.create({ name: "Proyecto" })
    ).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("devuelve undefined para respuestas 204", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-one" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(api.auth.logout()).resolves.toBeUndefined();
  });

  test("login rota el token CSRF después de crear sesión", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-before" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-1" }))
      .mockResolvedValueOnce(jsonResponse({ user: { id: "u1" } }))
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-session" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-2" }));

    await api.projects.create({ name: "Antes" });
    await api.auth.login({
      email: "user@example.com",
      password: "secret",
    });
    await api.projects.create({ name: "Después" });

    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/v1/auth/csrf");
    expect(requestHeadersAt(4).get("X-CSRF-Token")).toBe("csrf-session");
  });

  test("signup start rota el token hacia el contexto pending signup", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: null }))
      .mockResolvedValueOnce(
        jsonResponse({
          signup: {
            status: "pending",
            current_step: "business",
            expires_at: "2026-07-29T00:00:00Z",
            updated_at: null,
            version: 1,
            draft: {},
          },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-signup" }))
      .mockResolvedValueOnce(
        jsonResponse({
          signup: {
            status: "pending",
            current_step: "channels",
            expires_at: "2026-07-29T00:00:00Z",
            updated_at: "2026-07-28T00:00:00Z",
            version: 2,
            draft: {},
          },
        })
      );

    await api.auth.signup.start({
      email: "user@example.com",
      name: "User",
      password: "secret",
      interface_locale: "es",
    });

    await api.auth.signup.saveDraft(
      {
        step: "business",
        business: {
          name: "Negocio",
          category: "other" as never,
          country: "HN",
          city: "Tegucigalpa",
          primary_product: "Servicio",
          target_audience: "Clientes",
        },
      },
      1
    );

    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/v1/auth/csrf");
    expect(requestHeadersAt(3).get("X-CSRF-Token")).toBe("csrf-signup");
  });

  test("signup complete limpia el token pending signup", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-signup" }))
      .mockResolvedValueOnce(jsonResponse({ user_id: "u1" }))
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-session" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-1" }));

    await api.auth.signup.complete({
      idempotencyKey: "signup-complete-1",
    });
    await api.projects.create({ name: "Proyecto" });

    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/v1/auth/csrf");
    expect(requestHeadersAt(3).get("X-CSRF-Token")).toBe("csrf-session");
  });

  test("no usa document.cookie para obtener CSRF", async () => {
    const cookieGetter = vi.spyOn(document, "cookie", "get");

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-one" }))
      .mockResolvedValueOnce(jsonResponse({ id: "project-1" }));

    await api.projects.create({ name: "Proyecto" });

    expect(cookieGetter).not.toHaveBeenCalled();
    cookieGetter.mockRestore();
  });
});
