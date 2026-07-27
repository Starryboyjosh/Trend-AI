import { afterEach, describe, expect, test, vi } from "vitest";

import { api, createIdempotencyKey } from "@/lib/api";
import { disableDemoMode, enableDemoMode } from "@/lib/demo-mode";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllEnvs();
});

describe("cliente HTTP", () => {
  test("genera claves nativas únicas para operaciones nuevas", () => {
    const first = createIdempotencyKey();
    const second = createIdempotencyKey();

    expect(first).toMatch(/[a-z0-9-]+/i);
    expect(second).not.toBe(first);
  });

  test("reintenta errores recuperables con la misma clave", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { retryable: true } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    global.fetch = fetchMock;

    const result = api.conversations.sendMessage("conv-1", "Crea un post", undefined, [], {
      idempotencyKey: "stable-key",
      maxAttempts: 2,
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await expect(result).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ headers: expect.any(Headers) })
    );
    expect(
      ((fetchMock.mock.calls[0][1] as RequestInit).headers as Headers).get(
        "Idempotency-Key"
      )
    ).toBe("stable-key");
  });

  test("no reintenta errores de validación", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { retryable: false } }), { status: 422 })
    );
    global.fetch = fetchMock;

    await expect(
      api.conversations.sendMessage("conv-1", "", undefined, [], {
        idempotencyKey: "stable-key",
        maxAttempts: 3,
      })
    ).rejects.toMatchObject({ status: 422 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("respeta el máximo de intentos y Retry-After", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { retryable: true } }), {
        status: 429,
        headers: { "Retry-After": "0" },
      })
    );
    global.fetch = fetchMock;

    const result = api.conversations.sendMessage("conv-1", "Crea un post", undefined, [], {
      idempotencyKey: "stable-key",
      maxAttempts: 3,
    });
    const rejection = expect(result).rejects.toMatchObject({ status: 429 });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await rejection;
    vi.useRealTimers();
  });

  test("cancela el reintento y no crea otra petición", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("offline"));
    global.fetch = fetchMock;

    const result = api.conversations.sendMessage("conv-1", "Crea un post", undefined, [], {
      idempotencyKey: "stable-key",
      signal: controller.signal,
      maxAttempts: 3,
    });
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("acepta logout exitoso sin cuerpo (204)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      })
    );
    global.fetch = fetchMock;

    await expect(api.auth.logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
  });

  test("usa el contrato de Pending Signup y conserva expected_version", async () => {
    const progress = {
      signup: {
        status: "pending",
        current_step: "business",
        expires_at: "2099-01-01T00:00:00Z",
        updated_at: null,
        version: 1,
        draft: {},
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(progress), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(progress), { status: 200 }));
    global.fetch = fetchMock;

    await api.auth.signup.start({
      email: "ana@example.com",
      name: "Ana",
      password: "una-clave-segura-123",
      interface_locale: "es",
    });
    await api.auth.signup.saveDraft(
      {
        step: "business",
        business: {
          name: "Café Central",
          category: "gastronomy",
          country: "Honduras",
          city: "Tegucigalpa",
          primary_product: "Café artesanal",
          target_audience: "Personas que trabajan cerca",
        },
      },
      7
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/auth/signup/start",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toMatchObject({
      step: "business",
      expected_version: 7,
    });
  });

  test("envía una Idempotency-Key estable al completar signup", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    global.fetch = fetchMock;

    await api.auth.signup.complete({ idempotencyKey: "signup-completion-1" });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Idempotency-Key")).toBe("signup-completion-1");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/signup/complete");
  });

  test("consulta Google y usa el inicio OAuth controlado por backend", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ configured: true }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ authorization_url: "https://accounts.google.com/o/oauth2/v2/auth" }),
          { status: 200 }
        )
      );
    global.fetch = fetchMock;

    await expect(api.auth.google.status()).resolves.toEqual({ configured: true });
    await expect(api.auth.google.start()).resolves.toEqual({
      authorization_url: "https://accounts.google.com/o/oauth2/v2/auth",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/auth/google/status",
      expect.objectContaining({ credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/auth/google/start",
      expect.objectContaining({ credentials: "include" })
    );
  });

  test("propaga conflictos de versión sin reintentar a ciegas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "SIGNUP_CONFLICT",
            message: "El borrador fue actualizado en otra sesión.",
          },
        }),
        { status: 409 }
      )
    );
    global.fetch = fetchMock;

    await expect(
      api.auth.signup.saveDraft(
        {
          step: "review",
          review: { confirmed: true },
        },
        2
      )
    ).rejects.toMatchObject({ status: 409, code: "SIGNUP_CONFLICT" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("modo demo conserva un proyecto iniciado desde plantilla", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO", "true");
    enableDemoMode();

    const project = await api.projects.create({
      template_id: "template-demo-1",
      business_id: "business-demo-1",
    });
    const projects = await api.projects.list({ status: "active" });

    expect(project.source_template_id).toBe("template-demo-1");
    expect(projects.some((item) => item.id === project.id)).toBe(true);
  });
});
