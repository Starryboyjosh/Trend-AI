import { cloneDemo, demoData } from "@/lib/demo-data";
import {
  isDemoModeEnabled,
  readDemoProjects,
  saveDemoProjects,
} from "@/lib/demo-mode";
import type { Category, Objective, Platform } from "@/types/business";
import type { Tone } from "@/types/brand";
import type { PublicCapabilities } from "@/types/capabilities";

let _csrfToken: string | null = null;
let _csrfTokenPromise: Promise<string | null> | null = null;
let _csrfGeneration = 0;

const CSRF_API_PATH = "/api/v1/auth/csrf";

async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch(CSRF_API_PATH, {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return null;

    const body: { token?: string | null } = await res.json();
    return body.token ?? null;
  } catch {
    return null;
  }
}

async function ensureCsrfToken(): Promise<string | null> {
  if (_csrfToken) return _csrfToken;
  if (_csrfTokenPromise) return _csrfTokenPromise;

  const generation = _csrfGeneration;

  const promise = fetchCsrfToken()
    .then((token) => {
      if (generation !== _csrfGeneration) {
        return null;
      }

      _csrfToken = token;
      return token;
    })
    .finally(() => {
      if (_csrfTokenPromise === promise) {
        _csrfTokenPromise = null;
      }
    });

  _csrfTokenPromise = promise;
  return promise;
}

export function resetCsrfToken(): void {
  _csrfGeneration += 1;
  _csrfToken = null;
  _csrfTokenPromise = null;
}

async function resetCsrfAfter<T>(operation: Promise<T>): Promise<T> {
  const result = await operation;
  resetCsrfToken();
  return result;
}

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

export type RequestRetryCallback = (attempt: number) => void;

export interface ApiRequestOptions extends RequestInit {
  idempotencyKey?: string;
  maxAttempts?: number;
  onRetry?: RequestRetryCallback;
}

export type SignupStep = "business" | "channels" | "brand" | "review";

export interface SignupBusinessDraft {
  name: string;
  category: Category;
  country: string;
  city: string;
  description?: string;
  primary_product: string;
  target_audience: string;
  website_url?: string;
}

export interface SignupChannelsDraft {
  preferred_platforms: Platform[];
  primary_objective: Objective;
}

export interface SignupBrandDraft {
  voice_tones: Tone[];
  value_proposition: string;
  preferred_words: string[];
  forbidden_words: string[];
  primary_color?: string;
  secondary_color?: string;
  content_locale: "es" | "en" | "pt";
}

export interface SignupProgress {
  signup: {
    status: "pending" | "completed";
    current_step: SignupStep | "completed";
    expires_at: string;
    updated_at: string | null;
    version: number;
    draft: {
      business?: SignupBusinessDraft;
      channels?: SignupChannelsDraft;
      brand?: SignupBrandDraft;
      review?: { confirmed: boolean };
    };
  };
}

export type SignupDraftPayload =
  | { step: "business"; business: SignupBusinessDraft }
  | { step: "channels"; channels: SignupChannelsDraft }
  | { step: "brand"; brand: SignupBrandDraft }
  | { step: "review"; review: { confirmed: boolean } };

export interface GoogleSignInStatus {
  configured: boolean;
}

export interface GoogleAuthorizationStart {
  authorization_url: string;
}

export type InterfaceLocale = "es" | "en" | "pt";

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  interface_locale: InterfaceLocale;
  /** Word the backend accepts as confirmation, in the user's own locale. */
  deletion_confirmation_phrase: string;
}

/**
 * One usage group. A null cost is unknown, never zero: the counters say how
 * many generations in the group actually reported one.
 */
export interface UsageItem {
  capability: string;
  quality_level: string;
  generations: number;
  total_tokens: number | null;
  reported_cost: string | null;
  known_cost_count: number;
  unknown_cost_count: number;
  currency: string | null;
}

export type DeletionStatus = "pending" | "processing" | "completed" | "failed";

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;
const MAX_RETRY_AFTER_MS = 30_000;

export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `hitrendy-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function isAbortError(reason: unknown): boolean {
  return reason instanceof DOMException && reason.name === "AbortError";
}

function retryDelayMs(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds)) {
      return Math.min(Math.max(seconds * 1000, 0), MAX_RETRY_AFTER_MS);
    }

    const date = Date.parse(retryAfter);

    if (!Number.isNaN(date)) {
      return Math.min(Math.max(date - Date.now(), 0), MAX_RETRY_AFTER_MS);
    }
  }

  return RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);

    function onAbort() {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isRetryableError(error: ApiError): boolean {
  return RETRYABLE_STATUSES.has(error.status) || error.retryable;
}

const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

async function request<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  if (isDemoModeEnabled()) {
    return demoRequest<T>(path, options);
  }

  const maxAttempts = Math.max(
    1,
    options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  );

  const {
    idempotencyKey,
    onRetry,
    maxAttempts: _maxAttempts,
    ...fetchOptions
  } = options;

  const headers = new Headers(fetchOptions.headers);

  if (
    typeof fetchOptions.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }

  const method = (fetchOptions.method || "GET").toUpperCase();
  const requiresCsrf = !CSRF_SAFE_METHODS.has(method);

  let attempt = 1;
  let csrfRetryAvailable = true;

  while (attempt <= maxAttempts) {
    /*
     * Build a fresh Headers instance for every fetch attempt.
     * This prevents later CSRF refreshes from mutating the headers
     * associated with an earlier request.
     */
    const attemptHeaders = new Headers(headers);

    if (requiresCsrf) {
      attemptHeaders.delete("X-CSRF-Token");

      const token = await ensureCsrfToken();

      if (token) {
        attemptHeaders.set("X-CSRF-Token", token);
      }
    }

    try {
      const res = await fetch(path, {
        ...fetchOptions,
        headers: attemptHeaders,
        credentials: "include",
      });

      if (!res.ok) {
        let body: {
          error?: {
            code?: string;
            message?: string;
            retryable?: boolean;
          };
        } = {};

        try {
          body = await res.json();
        } catch {
          // The response may not contain JSON.
        }

        const error = new ApiError(
          res.status,
          body.error?.code || "UNKNOWN",
          body.error?.message || "Error de conexión",
          RETRYABLE_STATUSES.has(res.status) ||
            (body.error?.retryable ?? false)
        );

        /*
         * A CSRF refresh gets one dedicated retry and does not consume
         * maxAttempts because the backend rejected the request before
         * executing the protected operation.
         */
        if (
          error.code.startsWith("CSRF_TOKEN_") &&
          csrfRetryAvailable
        ) {
          csrfRetryAvailable = false;
          resetCsrfToken();
          onRetry?.(attempt + 1);
          continue;
        }

        if (
          !idempotencyKey ||
          !isRetryableError(error) ||
          attempt >= maxAttempts
        ) {
          throw error;
        }

        attempt += 1;
        onRetry?.(attempt);

        await waitForRetry(
          retryDelayMs(
            attempt - 1,
            res.headers.get("Retry-After")
          ),
          fetchOptions.signal ?? undefined
        );

        continue;
      }

      if (res.status === 204) {
        return undefined as T;
      }

      return res.json();
    } catch (reason) {
      if (isAbortError(reason)) {
        throw reason;
      }

      if (reason instanceof ApiError) {
        throw reason;
      }

      const error = new ApiError(
        0,
        "NETWORK_ERROR",
        "Error de conexión",
        true
      );

      if (
        !idempotencyKey ||
        !isRetryableError(error) ||
        attempt >= maxAttempts
      ) {
        throw error;
      }

      attempt += 1;
      onRetry?.(attempt);

      await waitForRetry(
        retryDelayMs(attempt - 1, null),
        fetchOptions.signal ?? undefined
      );
    }
  }

  throw new ApiError(
    0,
    "REQUEST_FAILED",
    "Error de conexión",
    true
  );
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

async function demoRequest<T>(
  path: string,
  options: RequestInit
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const url = new URL(path, "http://localhost");
  const pathname = url.pathname;

  if (pathname === "/api/v1/auth/me") {
    return cloneDemo(demoData.auth) as T;
  }

  if (
    pathname === "/api/v1/auth/login" ||
    pathname === "/api/v1/auth/register"
  ) {
    return cloneDemo(demoData.auth) as T;
  }

  if (pathname === "/api/v1/auth/logout") {
    return { ok: true } as T;
  }

  if (pathname === "/api/v1/capabilities" && method === "GET") {
    return {
      advisor: { status: "available", tier: "free", quality_levels: ["fast"] },
      copywriter: { status: "available", tier: "free", quality_levels: ["fast"] },
      vision_review: { status: "available", tier: "free", quality_levels: ["fast"] },
      image_generation: { status: "disabled", tier: "paid", quality_levels: [] },
      video_generation: { status: "disabled", tier: "paid", quality_levels: [] },
      trend_analysis: { status: "disabled", tier: "free", quality_levels: [] },
    } as T;
  }

  const demoProjects = readDemoProjects(
    cloneDemo(demoData.projects)
  );

  if (pathname === "/api/v1/projects" && method === "GET") {
    return cloneDemo(demoProjects) as T;
  }

  if (pathname === "/api/v1/projects" && method === "POST") {
    const data = parseJsonBody(options.body);
    const template = demoData.templates.find(
      (item) => item.id === data.template_id
    );
    const now = new Date().toISOString();

    const project = {
      id: `project-demo-${Date.now()}`,
      name:
        typeof data.name === "string"
          ? data.name
          : template?.title || "Proyecto sin título",
      business_id:
        typeof data.business_id === "string"
          ? data.business_id
          : "business-demo-1",
      platform: template?.platforms[0] || "instagram",
      status: "active" as const,
      updated_at: now,
      created_at: now,
      artifact_id: `artifact-demo-${Date.now()}`,
      source_template_id: template?.id || null,
      artifact_snapshot: {
        ...cloneDemo(demoData.artifacts.demoArtifact),
        hook:
          template?.title ||
          demoData.artifacts.demoArtifact.hook,
        format_recommendation:
          template?.formats[0] ||
          demoData.artifacts.demoArtifact
            .format_recommendation,
        assumptions: template
          ? [`Proyecto iniciado desde la plantilla ${template.title}.`]
          : demoData.artifacts.demoArtifact.assumptions,
      },
    };

    demoProjects.unshift(project);
    saveDemoProjects(demoProjects);

    return cloneDemo(project) as T;
  }

  const projectMatch = pathname.match(
    /^\/api\/v1\/projects\/([^/]+)(?:\/(.+))?$/
  );

  if (projectMatch) {
    const [, projectId, action] = projectMatch;
    const project = demoProjects.find(
      (item) => item.id === projectId
    );

    if (!project) {
      throw new ApiError(
        404,
        "NOT_FOUND",
        "Proyecto no encontrado.",
        false
      );
    }

    if (!action && method === "GET") {
      return cloneDemo(project) as T;
    }

    if (!action && method === "PATCH") {
      Object.assign(project, parseJsonBody(options.body), {
        updated_at: new Date().toISOString(),
      });
      saveDemoProjects(demoProjects);
      return cloneDemo(project) as T;
    }

    if (action === "versions" && method === "GET") {
      return [
        {
          id: `${project.id}-version-1`,
          version_number: 1,
          user_edited: false,
          created_at: project.updated_at,
        },
      ] as T;
    }

    if (
      action === "artifact-version" &&
      method === "PUT"
    ) {
      project.artifact_snapshot = parseJsonBody(
        options.body
      ) as typeof project.artifact_snapshot;
      project.updated_at = new Date().toISOString();
      saveDemoProjects(demoProjects);

      return { version_number: 2 } as T;
    }
  }

  if (
    pathname === "/api/v1/templates" &&
    method === "GET"
  ) {
    return cloneDemo(demoData.templates) as T;
  }

  if (
    pathname === "/api/v1/templates/recommendations"
  ) {
    return cloneDemo(demoData.templates) as T;
  }

  if (
    pathname === "/api/v1/businesses" &&
    method === "GET"
  ) {
    return cloneDemo(demoData.businesses) as T;
  }

  if (
    pathname === "/api/v1/businesses" &&
    method === "POST"
  ) {
    return { id: "business-demo-created" } as T;
  }

  if (
    /^\/api\/v1\/businesses\/[^/]+\/brand-profile$/.test(
      pathname
    ) &&
    method === "GET"
  ) {
    return cloneDemo(demoData.brandProfile) as T;
  }

  if (
    /^\/api\/v1\/businesses\/[^/]+\/brand-profile$/.test(
      pathname
    ) &&
    method === "PUT"
  ) {
    return cloneDemo(demoData.brandProfile) as T;
  }

  if (
    /^\/api\/v1\/businesses\/[^/]+$/.test(pathname) &&
    method === "PATCH"
  ) {
    return cloneDemo(demoData.businesses[0]) as T;
  }

  if (
    pathname === "/api/v1/conversations" &&
    method === "GET"
  ) {
    return cloneDemo(demoData.conversations) as T;
  }

  if (
    pathname === "/api/v1/conversations" &&
    method === "POST"
  ) {
    return { id: "conversation-demo-created" } as T;
  }

  if (
    pathname.startsWith("/api/v1/conversations/") &&
    method === "GET"
  ) {
    return {
      messages: [
        {
          id: "message-demo-1",
          role: "user",
          content:
            "Necesito un post para una promo de fin de semana.",
          metadata: null,
        },
        {
          id: "message-demo-2",
          role: "assistant",
          content:
            "Aquí tienes una propuesta lista para editar.",
          artifact: demoData.artifacts.demoArtifact,
          artifact_id: "artifact-demo-1",
        },
      ],
    } as T;
  }

  if (
    pathname.startsWith("/api/v1/conversations/") &&
    method === "POST"
  ) {
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

  if (
    pathname === "/api/v1/assets" &&
    method === "GET"
  ) {
    return [] as T;
  }

  if (
    pathname === "/api/v1/assets/uploads" &&
    method === "POST"
  ) {
    return {
      upload_id: "upload-demo",
      upload_url: "/api/v1/assets/uploads",
    } as T;
  }

  return {} as T;
}

function parseJsonBody(
  body: BodyInit | null | undefined
): Record<string, unknown> {
  if (typeof body !== "string") {
    return {};
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const BASE = "/api/v1";

export const api = {
  capabilities: {
    get(): Promise<PublicCapabilities> {
      return request<PublicCapabilities>(`${BASE}/capabilities`);
    },
  },

  conversations: {
    create(
      data: Record<string, unknown>,
      options: Pick<ApiRequestOptions, "idempotencyKey"> = {}
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/conversations`,
        {
          method: "POST",
          idempotencyKey: options.idempotencyKey,
          body: JSON.stringify(data),
        }
      );
    },

    list(
      params?: Record<string, string>
    ): Promise<Array<Record<string, unknown>>> {
      const qs = params
        ? `?${new URLSearchParams(params).toString()}`
        : "";

      return request(`${BASE}/conversations${qs}`);
    },

    get(id: string) {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/${id}`
      );
    },

    update(
      id: string,
      data: {
        title?: string;
        status?: "active" | "archived";
      }
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
    },

    sendMessage(
      conversationId: string,
      text: string,
      uiIntent?:
        | "create_social_post"
        | "create_short_video_script"
        | "analyze_visual",
      attachmentIds: string[] = [],
      options: Pick<
        ApiRequestOptions,
        "idempotencyKey" | "signal" | "onRetry" | "maxAttempts"
      > = {},
      generation?: {
        platform?: string;
        objective?: string;
        qualityLevel?: "fast" | "balanced" | "quality";
        locale?: "es" | "en" | "pt";
      }
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/${conversationId}/messages`,
        {
          method: "POST",
          ...options,
          body: JSON.stringify({
            text,
            ...(uiIntent
              ? { ui_intent: uiIntent }
              : {}),
            ...(attachmentIds.length
              ? { attachment_ids: attachmentIds }
              : {}),
            ...(generation?.platform ? { platform: generation.platform } : {}),
            ...(generation?.objective ? { objective: generation.objective } : {}),
            ...(generation?.qualityLevel ? { quality_level: generation.qualityLevel } : {}),
            ...(generation?.locale ? { locale: generation.locale } : {}),
          }),
        }
      );
    },
  },

  artifacts: {
    createVariation(
      conversationId: string,
      artifactId: string,
      kind: string,
      options: Pick<
        ApiRequestOptions,
        "idempotencyKey" | "signal" | "onRetry"
      > = {}
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/${conversationId}/artifacts/${artifactId}/variations`,
        {
          method: "POST",
          ...options,
          idempotencyKey:
            options.idempotencyKey ||
            createIdempotencyKey(),
          body: JSON.stringify({ kind }),
        }
      );
    },

    feedback(
      artifactId: string,
      rating: "useful" | "not_useful"
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/artifacts/${artifactId}/feedback`,
        {
          method: "POST",
          body: JSON.stringify({ rating }),
        }
      );
    },

    event(
      artifactId: string,
      eventType: "copied" | "saved"
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/conversations/artifacts/${artifactId}/events`,
        {
          method: "POST",
          body: JSON.stringify({
            event_type: eventType,
          }),
        }
      );
    },
  },

  projects: {
    create(
      data: Record<string, unknown>,
      options: Pick<ApiRequestOptions, "idempotencyKey"> = {}
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/projects`,
        {
          method: "POST",
          idempotencyKey: options.idempotencyKey,
          body: JSON.stringify(data),
        }
      );
    },

    list(
      params?: Record<string, string>
    ): Promise<Array<Record<string, unknown>>> {
      const qs = params
        ? `?${new URLSearchParams(params).toString()}`
        : "";

      return request(`${BASE}/projects${qs}`);
    },

    get(id: string) {
      return request<Record<string, unknown>>(
        `${BASE}/projects/${id}`
      );
    },

    update(
      id: string,
      data: Record<string, unknown>
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/projects/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
    },

    duplicate(id: string, options: Pick<ApiRequestOptions, "idempotencyKey"> = {}) {
      return request<Record<string, unknown>>(
        `${BASE}/projects/${id}/duplicate`,
        {
          method: "POST",
          idempotencyKey: options.idempotencyKey || createIdempotencyKey(),
        }
      );
    },

    export(id: string) {
      return request<Record<string, unknown>>(
        `${BASE}/projects/${id}/export`
      );
    },

    versions(id: string) {
      return request<Array<Record<string, unknown>>>(
        `${BASE}/projects/${id}/versions`
      );
    },

    restoreVersion(
      projectId: string,
      versionId: string
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/projects/${projectId}/versions/${versionId}/restore`,
        {
          method: "POST",
        }
      );
    },

    updateArtifactVersion(
      projectId: string,
      data: Record<string, unknown>
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/projects/${projectId}/artifact-version`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      );
    },
    startCreationFlow(
      businessId: string,
      options: Pick<ApiRequestOptions, "idempotencyKey"> = {}
    ) {
      return request<{ id: string; flow_started_at: string }>(
        `${BASE}/projects/flow-events`,
        { method: "POST", idempotencyKey: options.idempotencyKey, body: JSON.stringify({ business_id: businessId }) }
      );
    },
    completeCreationFlow(
      eventId: string,
      status: "generation_completed" | "completed" | "failed"
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/projects/flow-events/${eventId}`,
        { method: "PATCH", body: JSON.stringify({ status }) }
      );
    },
  },

  assets: {
    list(): Promise<Array<Record<string, unknown>>> {
      return request(`${BASE}/assets`);
    },

    get(id: string) {
      return request<Record<string, unknown>>(
        `${BASE}/assets/${id}`
      );
    },

    contentUrl(id: string) {
      return `${BASE}/assets/${id}/content`;
    },

    async upload(
      file: File
    ): Promise<Record<string, unknown>> {
      const init = await request<{
        upload_id: string;
        upload_url: string;
      }>(`${BASE}/assets/uploads`, {
        method: "POST",
      });

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
      const qs = params
        ? `?${new URLSearchParams(params).toString()}`
        : "";

      return request(`${BASE}/templates${qs}`);
    },

    get(id: string) {
      return request<Record<string, unknown>>(
        `${BASE}/templates/${id}`
      );
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
      return request<Record<string, unknown>>(
        `${BASE}/businesses`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
    },

    list(): Promise<
      Array<Record<string, unknown>>
    > {
      return request(`${BASE}/businesses`);
    },

    get(id: string) {
      return request<Record<string, unknown>>(
        `${BASE}/businesses/${id}`
      );
    },

    update(
      id: string,
      data: Record<string, unknown>
    ) {
      return request<Record<string, unknown>>(
        `${BASE}/businesses/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
    },

    brandProfile: {
      upsert(
        businessId: string,
        data: Record<string, unknown>
      ) {
        return request<Record<string, unknown>>(
          `${BASE}/businesses/${businessId}/brand-profile`,
          {
            method: "PUT",
            body: JSON.stringify(data),
          }
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
      return resetCsrfAfter(
        request(`${BASE}/auth/register`, {
          method: "POST",
          body: JSON.stringify(data),
        })
      );
    },

    login(data: {
      email: string;
      password: string;
    }) {
      return resetCsrfAfter(
        request(`${BASE}/auth/login`, {
          method: "POST",
          body: JSON.stringify(data),
        })
      );
    },

    google: {
      status() {
        return request<GoogleSignInStatus>(
          `${BASE}/auth/google/status`
        );
      },

      start() {
        return request<GoogleAuthorizationStart>(
          `${BASE}/auth/google/start`
        );
      },
    },

    signup: {
      start(data: {
        email: string;
        name: string;
        password: string;
        interface_locale: "es" | "en" | "pt";
      }) {
        return resetCsrfAfter(
          request<SignupProgress>(
            `${BASE}/auth/signup/start`,
            {
              method: "POST",
              body: JSON.stringify(data),
            }
          )
        );
      },

      get() {
        return request<SignupProgress>(
          `${BASE}/auth/signup`
        );
      },

      saveDraft(
        payload: SignupDraftPayload,
        expectedVersion: number
      ) {
        return request<SignupProgress>(
          `${BASE}/auth/signup`,
          {
            method: "PATCH",
            body: JSON.stringify({
              ...payload,
              expected_version: expectedVersion,
            }),
          }
        );
      },

      cancel() {
        return resetCsrfAfter(
          request<void>(`${BASE}/auth/signup`, {
            method: "DELETE",
          })
        );
      },

      complete(
        options: Pick<
          ApiRequestOptions,
          "idempotencyKey" | "signal" | "onRetry"
        > = {}
      ) {
        return resetCsrfAfter(
          request<Record<string, unknown>>(
            `${BASE}/auth/signup/complete`,
            {
              method: "POST",
              ...options,
              idempotencyKey:
                options.idempotencyKey,
            }
          )
        );
      },
    },

    logout() {
      return resetCsrfAfter(
        request<void>(`${BASE}/auth/logout`, {
          method: "POST",
        })
      );
    },

    me() {
      return request<{ user: AccountUser; workspaces: { id: string; role: string }[] }>(
        `${BASE}/auth/me`
      );
    },
    updateAccount(data: { name: string; interface_locale: InterfaceLocale }) {
      return request<{ user: AccountUser }>(`${BASE}/auth/account`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    usage() {
      return request<{ period_days: number; items: UsageItem[] }>(`${BASE}/auth/usage`);
    },
    /**
     * The status token is minted by the caller, so a retry of this request
     * resolves to the same purge job. The response never echoes it back.
     */
    deleteAccount(confirmation: string, statusToken: string) {
      return resetCsrfAfter(
        request<{ status: DeletionStatus }>(`${BASE}/auth/account/delete`, {
          method: "POST",
          body: JSON.stringify({ confirmation, status_token: statusToken }),
        })
      );
    },
    deletionStatus(statusToken: string) {
      return request<{ status: DeletionStatus }>(`${BASE}/auth/account/deletion-status`, {
        headers: { "X-Deletion-Status-Token": statusToken },
      });
    },
  },
};
