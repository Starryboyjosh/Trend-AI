"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TemplateCard } from "@/components/template-card";
import { AppShell } from "@/components/shell/app-shell";
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

  const visualSources = [
    "/figma/home/source-15.png",
    "/figma/home/source-16.png",
    "/figma/home/source-18.png",
    "/figma/home/source-19.png",
    "/figma/home/source-4.jpeg",
    "/figma/home/source-5.jpeg",
  ];

  return (
    <AppShell>
      <main className="app-page templates-page">
        <header className="templates-hero">
          <p>INSPIRACIÓN PARA TU NEGOCIO</p>
          <h1>Empieza a diseñar</h1>
          <span>Elige una idea, edítala y hazla tuya.</span>
        </header>

        <div className="template-toolbar">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar plantillas..."
            aria-label="Buscar plantillas"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            aria-label="Filtrar por plataforma"
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
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <section
          className="template-recommendations"
          aria-labelledby="recommendations-title"
        >
          <div className="section-heading">
            <h2 id="recommendations-title">Recomendadas para ti</h2>
            <button
              type="button"
              onClick={loadRecommendations}
              disabled={recommending}
              className="button-secondary"
            >
              {recommending ? "Buscando…" : "Recomendar"}
            </button>
          </div>
          {recommendations.length > 0 ? (
            <div className="recommendation-list">
              {recommendations.map((template) => (
                <div key={template.id} className="recommendation-item">
                  <strong>{template.title}</strong>
                  <p>{template.rationale}</p>
                  <button
                    type="button"
                    onClick={() => handleUseTemplate(template.id)}
                    disabled={creating !== null}
                    className="button-ghost"
                  >
                    {creating === template.id
                      ? "Creando…"
                      : "Usar esta plantilla"}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {error && (
          <div role="alert" className="page-error">
            {error}
          </div>
        )}

        {loading ? (
          <p className="page-intro">Cargando plantillas...</p>
        ) : templates.length === 0 ? (
          <div className="templates-empty">
            <p>No se encontraron plantillas con esos filtros.</p>
          </div>
        ) : (
          <div className="template-grid">
            {templates.map((t, index) => (
              <TemplateCard
                key={t.id}
                template={t}
                onUse={handleUseTemplate}
                using={creating === t.id}
                previewSrc={visualSources[index % visualSources.length]}
              />
            ))}
          </div>
        )}

        <section className="tiktok-inspiration" aria-labelledby="tiktok-title">
          <p>Descubre nuevas ideas</p>
          <h2 id="tiktok-title">
            Explora videos de TikTok listos para editar y publicar
          </h2>
          <div className="tiktok-grid">
            {[1, 2, 3, 4].map((item) => (
              <article key={item}>
                <Image
                  src={`/figma/templates/tiktok-${item}.jpeg`}
                  alt="Inspiración visual para video corto"
                  fill
                  sizes="(max-width: 639px) 50vw, 25vw"
                />
                <button type="button" onClick={() => router.push("/assistant")}>
                  Editar plantilla
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
