"use client";

import type { Objective, Platform } from "@/types/business";

interface Props {
  data: { preferred_platforms: Platform[]; primary_objective: Objective | "" };
  onChange: (field: string, value: unknown) => void;
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
];

const OBJECTIVES: { value: Objective; label: string }[] = [
  { value: "reach", label: "Alcance" },
  { value: "engagement", label: "Interacción" },
  { value: "sales", label: "Ventas" },
  { value: "store_visits", label: "Visitas a la tienda" },
  { value: "launch", label: "Lanzamiento" },
  { value: "brand_awareness", label: "Reconocimiento de marca" },
  { value: "community", label: "Comunidad" },
];

export function StepChannels({ data, onChange }: Props) {
  function togglePlatform(p: Platform) {
    const current = data.preferred_platforms;
    const next = current.includes(p)
      ? current.filter((x) => x !== p)
      : [...current, p];
    onChange("preferred_platforms", next);
  }

  return (
    <section>
      <h2 style={{ fontFamily: "var(--font-heading)", marginTop: 0 }}>
        Canales y objetivos
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <fieldset>
          <legend>Redes sociales que usas *</legend>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
          >
            {PLATFORMS.map((p) => (
              <label
                key={p.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--border)",
                  background: data.preferred_platforms.includes(p.value)
                    ? "var(--primary)"
                    : "var(--surface)",
                  color: data.preferred_platforms.includes(p.value)
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={data.preferred_platforms.includes(p.value)}
                  onChange={() => togglePlatform(p.value)}
                  style={{ accentColor: "var(--primary)" }}
                />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="obj-primary">Objetivo principal *</label>
          <select
            id="obj-primary"
            value={data.primary_objective}
            onChange={(e) => onChange("primary_objective", e.target.value)}
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          >
            <option value="">Seleccionar...</option>
            {OBJECTIVES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
