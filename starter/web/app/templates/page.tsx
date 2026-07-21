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

  useEffect(() => {
    loadTemplates();
  }, [platform, category]);

  async function loadTemplates() {
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
  }

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
        const project = await api.projects.create({
          template_id: templateId,
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
    [router],
  );

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
        <p style={{ color: "var(--muted-foreground)" }}>Cargando plantillas...</p>
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
