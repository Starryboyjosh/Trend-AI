"use client";

import Image from "next/image";

import type { Template } from "@/types/template";

interface Props {
  template: Template;
  onUse: (templateId: string) => void;
  using?: boolean;
  previewSrc?: string;
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

export function TemplateCard({ template, onUse, using, previewSrc }: Props) {
  return (
    <article className="template-card">
      <div className="template-card-preview">
        {previewSrc ? (
          <Image
            src={previewSrc}
            alt=""
            fill
            sizes="(max-width: 639px) 50vw, (max-width: 1200px) 33vw, 260px"
            aria-hidden="true"
          />
        ) : null}
        <span aria-hidden="true">{template.platforms[0] || "Plantilla"}</span>
        <strong>{template.title}</strong>
      </div>
      <div className="template-card-content">
        <h3>{template.title}</h3>
        {template.description && (
          <p className="template-card-description">{template.description}</p>
        )}
        <div className="template-tags">
          {template.platforms.map((p) => (
            <span key={p} className="template-tag">
              {PLATFORM_LABELS[p] || p}
            </span>
          ))}
        </div>
        <div className="template-tags template-formats">
          {template.formats.map((f) => (
            <span key={f} className="template-format">
              {FORMAT_LABELS[f] || f}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onUse(template.id)}
          disabled={using}
          className="template-use-button"
        >
          {using ? "Creando..." : "Usar plantilla"}
        </button>
      </div>
    </article>
  );
}
