import { cloneDemo, demoData } from "@/lib/demo-data";
import { isDemoModeEnabled } from "@/lib/demo-mode";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable: boolean
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isDemoModeEnabled()) {
    return demoRequest<T>(path, options);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let body: {
      error?: { code?: string; message?: string; retryable?: boolean };
    } = {};
    try {
      body = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      res.status,
      body.error?.code || "UNKNOWN",
      body.error?.message || "Error de conexión",
      body.error?.retryable ?? false
    );
  }

  return res.json();
}

async function requestForm<T>(path: string, body: FormData): Promise<T> {
  if (isDemoModeEnabled()) {
    return demoRequest<T>(path, { method: "POST", body });
  }

  const res = await fetch(path, {
    method: "POST",
    body,
    credentials: "include",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      payload.error?.code || "UNKNOWN",
      payload.error?.message || "Error de conexión",
      payload.error?.retryable ?? false
    );
  }
  return res.json();
}

async function demoRequest<T>(path: string, options: RequestInit): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const url = new URL(path, "http://localhost");
  const pathname = url.pathname;

  if (pathname === "/api/v1/auth/me") return cloneDemo(demoData.auth) as T;
  if (pathname === "/api/v1/auth/login" || pathname === "/api/v1/auth/register")
    return cloneDemo(demoData.auth) as T;
  if (pathname === "/api/v1/auth/logout") return { ok: true } as T;

  if (pathname === "/api/v1/projects" && method === "GET") {
    return cloneDemo(demoData.projects) as T;
  }
  if (pathname.startsWith("/api/v1/projects/") && method === "PATCH") {
    return { ok: true } as T;
  }
  if (pathname.startsWith("/api/v1/projects/") && method === "POST") {
    return { ok: true } as T;
  }

  if (pathname === "/api/v1/templates" && method === "GET") {
    return cloneDemo(demoData.templates) as T;
  }
  if (pathname === "/api/v1/templates/recommendations") {
    return cloneDemo(demoData.templates) as T;
  }

  if (pathname === "/api/v1/businesses" && method === "GET") {
    return cloneDemo(demoData.businesses) as T;
  }
  if (pathname === "/api/v1/businesses" && method === "POST") {
    return { id: "business-demo-created" } as T;
  }
  if (
    /^\/api\/v1\/businesses\/[^/]+\/brand-profile$/.test(pathname) &&
    method === "GET"
  ) {
    return cloneDemo(demoData.brandProfile) as T;
  }
  if (
    /^\/api\/v1\/businesses\/[^/]+\/brand-profile$/.test(pathname) &&
    method === "PUT"
  ) {
    return cloneDemo(demoData.brandProfile) as T;
  }
  if (/^\/api\/v1\/businesses\/[^/]+$/.test(pathname) && method === "PATCH") {
    return cloneDemo(demoData.businesses[0]) as T;
  }

  if (pathname === "/api/v1/conversations" && method === "GET") {
    return cloneDemo(demoData.conversations) as T;
  }
  if (pathname === "/api/v1/conversations" && method === "POST") {
    return { id: "conversation-demo-created" } as T;
  }
  if (pathname.startsWith("/api/v1/conversations/") && method === "GET") {
    return {
      messages: [
        {
          id: "message-demo-1",
          role: "user",
          content: "Necesito un post para una promo de fin de semana.",
          metadata: null,
        },
        {
          id: "message-demo-2",
          role: "assistant",
          content: "Aquí tienes una propuesta lista para editar.",
          artifact: demoData.artifacts.demoArtifact,
          artifact_id: "artifact-demo-1",
        },
      ],
    } as T;
  }
  if (pathname.startsWith("/api/v1/conversations/") && method === "POST") {
    return {
      type: "artifact",
      assistant_message: {
        id: "message-demo-3",
        content: "Aquí tienes tu borrador de ejemplo.",
      },
      artifact: demoData.artifacts.demoArtifact,
      artifact_id: "artifact-demo-1",
    } as T;
  }

  if (pathname === "/api/v1/assets" && method === "GET") return [] as T;
  if (pathname === "/api/v1/assets/uploads" && method === "POST") {
    return {
      upload_id: "upload-demo",
      upload_url: "/api/v1/assets/uploads",
    } as T;
  }

  return {} as T;
}

const BASE = "/api/v1";

export const api = {
  conversations: {
    create(data: Record<string, unknown>) {
      return request<Record<string, unknown>>(`${BASE}/conversations`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    list(
      params?: Record<string, string>
    ): Promise<Array<Record<string, unknown>>> {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`${BASE}/conversations${qs}`);
    },
    get(id: string) {
      return request<Record<string, unknown>>(`${BASE}/conversations/${id}`);
    },
    update(
      id: string,
      data: { title?: string; status?: "active" | "archived" }
    ) {
      return request<Record<string, unknown>>(`${BASE}/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    sendMessage(
      conversationId: string,
      text: string,
      uiIntent?:
        "create_social_post" | "create_short_video_script" | "analyze_visual",
      attachmentIds: string[] = []
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            text,
            ...(uiIntent ? { ui_intent: uiIntent } : {}),
            ...(attachmentIds.length ? { attachment_ids: attachmentIds } : {}),
          }),
        }
      );
    },
  },
  artifacts: {
    createVariation(conversationId: string, artifactId: string, kind: string) {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/${conversationId}/artifacts/${artifactId}/variations`,
        { method: "POST", body: JSON.stringify({ kind }) }
      );
    },
    feedback(artifactId: string, rating: "useful" | "not_useful") {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/artifacts/${artifactId}/feedback`,
        { method: "POST", body: JSON.stringify({ rating }) }
      );
    },
    event(artifactId: string, eventType: "copied" | "saved") {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/artifacts/${artifactId}/events`,
        { method: "POST", body: JSON.stringify({ event_type: eventType }) }
      );
    },
  },
  projects: {
    create(data: Record<string, unknown>) {
      return request<Record<string, unknown>>(`${BASE}/projects`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    list(
      params?: Record<string, string>
    ): Promise<Array<Record<string, unknown>>> {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`${BASE}/projects${qs}`);
    },
    get(id: string) {
      return request<Record<string, unknown>>(`${BASE}/projects/${id}`);
    },
    update(id: string, data: Record<string, unknown>) {
      return request<Record<string, unknown>>(`${BASE}/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    duplicate(id: string) {
      return request<Record<string, unknown>>(
        `${BASE}/projects/${id}/duplicate`,
        {
          method: "POST",
        }
      );
    },
    export(id: string) {
      return request<Record<string, unknown>>(`${BASE}/projects/${id}/export`);
    },
    versions(id: string) {
      return request<Array<Record<string, unknown>>>(
        `${BASE}/projects/${id}/versions`
      );
    },
    restoreVersion(projectId: string, versionId: string) {
      return request<Record<string, unknown>>(
        `${BASE}/projects/${projectId}/versions/${versionId}/restore`,
        { method: "POST" }
      );
    },
    updateArtifactVersion(projectId: string, data: Record<string, unknown>) {
      return request<Record<string, unknown>>(
        `${BASE}/projects/${projectId}/artifact-version`,
        { method: "PUT", body: JSON.stringify(data) }
      );
    },
  },
  assets: {
    list(): Promise<Array<Record<string, unknown>>> {
      return request(`${BASE}/assets`);
    },
    get(id: string) {
      return request<Record<string, unknown>>(`${BASE}/assets/${id}`);
    },
    contentUrl(id: string) {
      return `${BASE}/assets/${id}/content`;
    },
    async upload(file: File): Promise<Record<string, unknown>> {
      const init = await request<{ upload_id: string; upload_url: string }>(
        `${BASE}/assets/uploads`,
        { method: "POST" }
      );
      const form = new FormData();
      form.append("file", file);
      return requestForm(init.upload_url, form);
    },
    analyze(assetId: string) {
      return request<Record<string, unknown>>(
        `${BASE}/assets/${assetId}/analyses`,
        {
          method: "POST",
        }
      );
    },
  },
  templates: {
    list(
      params?: Record<string, string>
    ): Promise<Array<Record<string, unknown>>> {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`${BASE}/templates${qs}`);
    },
    get(id: string) {
      return request<Record<string, unknown>>(`${BASE}/templates/${id}`);
    },
    recommend(data: {
      platform: string;
      objective: string;
      category?: string;
      limit?: number;
    }) {
      return request<Array<Record<string, unknown>>>(
        `${BASE}/templates/recommendations`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
    },
  },
  businesses: {
    create(data: Record<string, unknown>) {
      return request<Record<string, unknown>>(`${BASE}/businesses`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    list(): Promise<Array<Record<string, unknown>>> {
      return request(`${BASE}/businesses`);
    },
    get(id: string) {
      return request<Record<string, unknown>>(`${BASE}/businesses/${id}`);
    },
    update(id: string, data: Record<string, unknown>) {
      return request<Record<string, unknown>>(`${BASE}/businesses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    brandProfile: {
      upsert(businessId: string, data: Record<string, unknown>) {
        return request<Record<string, unknown>>(
          `${BASE}/businesses/${businessId}/brand-profile`,
          { method: "PUT", body: JSON.stringify(data) }
        );
      },
      get(businessId: string) {
        return request<Record<string, unknown>>(
          `${BASE}/businesses/${businessId}/brand-profile`
        );
      },
    },
  },
  auth: {
    register(data: {
      email: string;
      name: string;
      password: string;
      workspace_name: string;
    }) {
      return request(`${BASE}/auth/register`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    login(data: { email: string; password: string }) {
      return request(`${BASE}/auth/login`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    logout() {
      return request<void>(`${BASE}/auth/logout`, { method: "POST" });
    },
    me() {
      return request<{
        user: { id: string; name: string; email: string };
        workspaces: { id: string; role: string }[];
      }>(`${BASE}/auth/me`);
    },
  },
};
