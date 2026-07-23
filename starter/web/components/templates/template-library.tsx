"use client";

import Image from "next/image";
import { useDeferredValue, useState } from "react";

import {
  matchesTemplate,
  templateCategories,
  toTemplatePresentation,
  type TemplateCategory,
} from "@/lib/template-catalog";
import type { Template } from "@/types/template";

interface Props {
  templates: Template[];
  onUse: (template: Template) => void;
  compact?: boolean;
}

export function TemplateLibrary({ templates, onUse, compact = false }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("all");
  const deferredQuery = useDeferredValue(query);
  const matching = templates
    .map(toTemplatePresentation)
    .filter((template) => matchesTemplate(template, deferredQuery, category));

  return (
    <section
      className={`template-library ${compact ? "template-library--compact" : ""}`}
      aria-label="Biblioteca de plantillas"
    >
      {!compact ? (
        <>
          <div className="template-library-heading">
            <div>
              <p className="eyebrow">BIBLIOTECA CREATIVA</p>
              <h1>Explora plantillas</h1>
              <p>Encuentra una base por formato, categoría o tema.</p>
            </div>
            <span className="template-count" role="status">
              {matching.length}{" "}
              {matching.length === 1 ? "plantilla" : "plantillas"}
            </span>
          </div>
          <div className="template-toolbar">
            <label className="template-search" htmlFor="template-search">
              <span aria-hidden="true">⌕</span>
              <span className="visually-hidden">Buscar plantillas</span>
              <input
                id="template-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, formato o tema..."
              />
            </label>
            <div
              className="template-filter-row"
              aria-label="Categorías de plantillas"
            >
              {templateCategories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="template-filter"
                  aria-pressed={category === item.id}
                  onClick={() => setCategory(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {matching.length ? (
        <div className="template-visual-grid">
          {matching.map((template) => (
            <article className="visual-template-card" key={template.id}>
              <div
                className="visual-template-media"
                style={{ aspectRatio: template.aspectRatio }}
              >
                <Image
                  src={template.thumbnail_url}
                  alt={`Vista previa: ${template.title}`}
                  fill
                  sizes={
                    compact
                      ? "(max-width: 639px) 45vw, 180px"
                      : "(max-width: 639px) 45vw, (max-width: 1024px) 30vw, 220px"
                  }
                />
                <span>{template.displayCategory}</span>
              </div>
              <div className="visual-template-copy">
                <h2>{template.title}</h2>
                <p>
                  {template.displayCategory} ·{" "}
                  {template.aspectRatio.replaceAll(" / ", ":")}
                </p>
                <button type="button" onClick={() => onUse(template)}>
                  Usar plantilla <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="template-empty" role="status">
          <strong>No encontramos plantillas</strong>
          <span>
            Prueba otra búsqueda o selecciona una categoría diferente.
          </span>
        </div>
      )}
    </section>
  );
}
