"use client";

import type { Tone } from "@/types/brand";

interface Props {
  data: {
    voice_tones: Tone[];
    value_proposition: string;
    preferred_words: string;
    forbidden_words: string;
    primary_color: string;
    secondary_color: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const TONES: { value: Tone; label: string }[] = [
  { value: "friendly", label: "Amigable" },
  { value: "professional", label: "Profesional" },
  { value: "youthful", label: "Juvenil" },
  { value: "elegant", label: "Elegante" },
  { value: "fun", label: "Divertido" },
  { value: "direct", label: "Directo" },
  { value: "inspiring", label: "Inspirador" },
];

export function StepBrand({ data, onChange }: Props) {
  function toggleTone(t: Tone) {
    const current = data.voice_tones;
    const next = current.includes(t)
      ? current.filter((x) => x !== t)
      : [...current, t];
    onChange("voice_tones", next.slice(0, 3));
  }

  return (
    <section>
      <h2 style={{ fontFamily: "var(--font-heading)", marginTop: 0 }}>
        Identidad de marca
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <fieldset>
          <legend>Tonos de voz (máx. 3) *</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {TONES.map((t) => (
              <label
                key={t.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--border)",
                  background: data.voice_tones.includes(t.value)
                    ? "var(--primary)"
                    : "var(--surface)",
                  color: data.voice_tones.includes(t.value)
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={data.voice_tones.includes(t.value)}
                  onChange={() => toggleTone(t.value)}
                  disabled={
                    !data.voice_tones.includes(t.value) &&
                    data.voice_tones.length >= 3
                  }
                  style={{ accentColor: "var(--primary)" }}
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="brand-value-prop">Propuesta de valor *</label>
          <textarea
            id="brand-value-prop"
            value={data.value_proposition}
            onChange={(e) => onChange("value_proposition", e.target.value)}
            required
            maxLength={500}
            rows={3}
            placeholder="Ej: Café artesanal de origen responsable"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </div>
        <div>
          <label htmlFor="brand-preferred">Palabras preferidas</label>
          <input
            id="brand-preferred"
            type="text"
            value={data.preferred_words}
            onChange={(e) => onChange("preferred_words", e.target.value)}
            placeholder="Separadas por comas"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </div>
        <div>
          <label htmlFor="brand-forbidden">Palabras prohibidas</label>
          <input
            id="brand-forbidden"
            type="text"
            value={data.forbidden_words}
            onChange={(e) => onChange("forbidden_words", e.target.value)}
            placeholder="Separadas por comas"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <label htmlFor="brand-primary-color">Color primario</label>
            <input
              id="brand-primary-color"
              type="color"
              value={data.primary_color || "#541787"}
              onChange={(e) => onChange("primary_color", e.target.value)}
              style={{ display: "block", marginTop: 4 }}
            />
          </div>
          <div>
            <label htmlFor="brand-secondary-color">Color secundario</label>
            <input
              id="brand-secondary-color"
              type="color"
              value={data.secondary_color || "#B79CFA"}
              onChange={(e) => onChange("secondary_color", e.target.value)}
              style={{ display: "block", marginTop: 4 }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
