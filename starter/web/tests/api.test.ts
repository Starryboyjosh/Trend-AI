import { afterEach, describe, expect, test, vi } from "vitest";

import { api, createIdempotencyKey } from "@/lib/api";
import { disableDemoMode, enableDemoMode } from "@/lib/demo-mode";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  window.localStorage.clear();
  window.sessionStorage.clear();
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

  test("modo demo conserva un proyecto iniciado desde plantilla", async () => {
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
