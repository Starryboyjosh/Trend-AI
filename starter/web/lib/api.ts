export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable: boolean,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const WORKSPACE_ID = "ws_demo_001";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Workspace-Id": WORKSPACE_ID,
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    let body: { error?: { code?: string; message?: string; retryable?: boolean } } = {};
    try {
      body = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      res.status,
      body.error?.code || "UNKNOWN",
      body.error?.message || "Error de conexión",
      body.error?.retryable ?? false,
    );
  }

  return res.json();
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
    list(): Promise<Array<Record<string, unknown>>> {
      return request(`${BASE}/conversations`);
    },
    get(id: string) {
      return request<Record<string, unknown>>(`${BASE}/conversations/${id}`);
    },
    sendMessage(conversationId: string, text: string) {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/${conversationId}/messages`,
        { method: "POST", body: JSON.stringify({ text }) },
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
          { method: "PUT", body: JSON.stringify(data) },
        );
      },
      get(businessId: string) {
        return request<Record<string, unknown>>(
          `${BASE}/businesses/${businessId}/brand-profile`,
        );
      },
    },
  },
};
