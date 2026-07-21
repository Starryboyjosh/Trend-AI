"use client";

import type { Template } from "@/types/template";

interface Props {
  template: Template;
  onUse: (templateId: string) => void;
  using?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "IG",
  facebook: "FB",
  tiktok: "TT",
  youtube: "YT",
  whatsapp: "WA",
  linkedin: "LI",
  x: "X",
};

const FORMAT_LABELS: Record<string, string> = {
  reel: "Reel",
  short_video: "Video",
  static_post: "Post",
  carousel: "Carrusel",
  story: "Historia",
  text_post: "Texto",
};

export function TemplateCard({ template, onUse, using }: Props) {
  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 140,
          background: "var(--gradient-hero)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ht-white)",
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          fontSize: "1.2rem",
          textAlign: "center",
          padding: 16,
        }}
      >
        {template.title}
      </div>
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3
          style={{
            margin: "0 0 8px",
            fontFamily: "var(--font-heading)",
            fontSize: "1rem",
            color: "var(--foreground)",
          }}
        >
          {template.title}
        </h3>
        {template.description && (
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.85rem",
              color: "var(--muted-foreground)",
              lineHeight: 1.4,
            }}
          >
            {template.description}
          </p>
        )}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          {template.platforms.map((p) => (
            <span
              key={p}
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                background: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              {PLATFORM_LABELS[p] || p}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: "auto" }}>
          {template.formats.map((f) => (
            <span
              key={f}
              style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {FORMAT_LABELS[f] || f}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onUse(template.id)}
          disabled={using}
          style={{
            marginTop: 12,
            padding: "8px 16px",
            border: 0,
            borderRadius: "var(--radius-sm)",
            background: "var(--gradient-primary)",
            color: "var(--primary-foreground)",
            fontWeight: 600,
            cursor: using ? "not-allowed" : "pointer",
            opacity: using ? 0.6 : 1,
            width: "100%",
          }}
        >
          {using ? "Creando..." : "Usar plantilla"}
        </button>
      </div>
    </article>
  );
}
