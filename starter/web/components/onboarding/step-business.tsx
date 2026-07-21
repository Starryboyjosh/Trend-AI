"use client";

import type { Category } from "@/types/business";

interface Props {
  data: { name: string; category: Category | ""; description: string };
  onChange: (field: string, value: string) => void;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "fashion", label: "Moda" },
  { value: "art", label: "Arte" },
  { value: "lifestyle", label: "Estilo de vida" },
  { value: "health", label: "Salud" },
  { value: "gastronomy", label: "Gastronomía" },
  { value: "services", label: "Servicios" },
  { value: "retail", label: "Comercio" },
  { value: "technology", label: "Tecnología" },
  { value: "other", label: "Otro" },
];

export function StepBusiness({ data, onChange }: Props) {
  return (
    <section>
      <h2 style={{ fontFamily: "var(--font-heading)", marginTop: 0 }}>
        Información del negocio
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="biz-name">Nombre del negocio *</label>
          <input
            id="biz-name"
            type="text"
            value={data.name}
            onChange={(e) => onChange("name", e.target.value)}
            required
            maxLength={120}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </div>
        <div>
          <label htmlFor="biz-category">Categoría *</label>
          <select
            id="biz-category"
            value={data.category}
            onChange={(e) => onChange("category", e.target.value)}
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          >
            <option value="">Seleccionar...</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="biz-desc">Descripción</label>
          <textarea
            id="biz-desc"
            value={data.description}
            onChange={(e) => onChange("description", e.target.value)}
            maxLength={1000}
            rows={3}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </div>
      </div>
    </section>
  );
}
