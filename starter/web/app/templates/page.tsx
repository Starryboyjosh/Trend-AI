"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TemplateCard } from "@/components/template-card";
import { api, ApiError } from "@/lib/api";
import type { Template } from "@/types/template";

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "promotion", label: "Promoción" },
  { value: "awareness", label: "Reconocimiento" },
  { value: "launch", label: "Lanzamiento" },
  { value: "education", label: "Educativo" },
  { value: "social_proof", label: "Prueba social" },
  { value: "events", label: "Eventos" },
];

const PLATFORM_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [category, setCategory] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<
    Array<Template & { rationale: string }>
  >([]);
  const [recommending, setRecommending] = useState(false);

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const businesses = await api.businesses.list();
        setBusinessId((businesses[0]?.id as string | undefined) ?? null);
      } catch {
        setBusinessId(null);
      }
    };
    void loadBusiness();
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (platform) params.platform = platform;
      if (category) params.category = category;
      if (search) params.search = search;
      const data = await api.templates.list(params);
      setTemplates(data as unknown as Template[]);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar plantillas.");
      }
    } finally {
      setLoading(false);
    }
  }, [category, platform, search]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      loadTemplates();
    }
  }

  const handleUseTemplate = useCallback(
    async (templateId: string) => {
      setCreating(templateId);
      setError("");
      try {
        if (!businessId) {
          router.push("/onboarding");
          return;
        }
        const project = await api.projects.create({
          template_id: templateId,
          business_id: businessId,
        });
        router.push(`/projects/${project.id as string}`);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Error al crear proyecto desde plantilla.");
        }
        setCreating(null);
      }
    },
    [businessId, router]
  );

  async function loadRecommendations() {
    setRecommending(true);
    setError("");
    try {
      setRecommendations(
        (await api.templates.recommend({
          platform: platform || "instagram",
          objective: "sales",
          category: category || undefined,
        })) as unknown as Array<Template & { rationale: string }>
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No pudimos recomendar plantillas."
      );
    } finally {
      setRecommending(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 24px",
        minHeight: "100vh",
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            color: "var(--primary)",
            cursor: "pointer",
            padding: 0,
            marginBottom: 8,
            display: "block",
          }}
        >
          &larr; Volver
        </button>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.8rem",
            margin: 0,
            color: "var(--foreground)",
          }}
        >
          Plantillas
        </h1>
        <p style={{ color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Elige una plantilla para empezar tu proyecto.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Buscar plantillas..."
          aria-label="Buscar plantillas"
          style={{
            flex: 1,
            minWidth: 200,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            font: "inherit",
            background: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          aria-label="Filtrar por plataforma"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            font: "inherit",
            background: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filtrar por categoría"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            font: "inherit",
            background: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <section
        style={{ marginBottom: 24 }}
        aria-labelledby="recommendations-title"
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <h2
            id="recommendations-title"
            style={{ fontSize: "1rem", margin: 0 }}
          >
            Recomendadas para ti
          </h2>
          <button
            type="button"
            onClick={loadRecommendations}
            disabled={recommending}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              color: "var(--foreground)",
              cursor: recommending ? "not-allowed" : "pointer",
            }}
          >
            {recommending ? "Buscando…" : "Recomendar"}
          </button>
        </div>
        {recommendations.length > 0 ? (
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {recommendations.map((template) => (
              <div
                key={template.id}
                style={{
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface)",
                }}
              >
                <strong>{template.title}</strong>
                <p
                  style={{
                    margin: "4px 0 0",
                    color: "var(--muted-foreground)",
                    fontSize: "0.85rem",
                  }}
                >
                  {template.rationale}
                </p>
                <button
                  type="button"
                  onClick={() => handleUseTemplate(template.id)}
                  disabled={creating !== null}
                  style={{
                    marginTop: 10,
                    padding: "7px 10px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface)",
                    color: "var(--foreground)",
                    cursor: creating !== null ? "not-allowed" : "pointer",
                    opacity: creating !== null ? 0.65 : 1,
                  }}
                >
                  {creating === template.id ? "Creando…" : "Usar esta plantilla"}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: "var(--radius-md)",
            marginBottom: 16,
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--muted-foreground)" }}>
          Cargando plantillas...
        </p>
      ) : templates.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            color: "var(--muted-foreground)",
          }}
        >
          <p>No se encontraron plantillas con esos filtros.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onUse={handleUseTemplate}
              using={creating === t.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
