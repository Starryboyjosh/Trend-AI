import { afterEach, describe, expect, test, vi } from "vitest";

import { api } from "@/lib/api";
import { disableDemoMode, enableDemoMode } from "@/lib/demo-mode";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("cliente HTTP", () => {
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
