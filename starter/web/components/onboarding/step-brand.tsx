"use client";

import type { Tone } from "@/types/brand";
import { optionLabel, surfaceCopy, useInterfaceLocale } from "@/lib/i18n";

interface Props {
  data: {
    voice_tones: Tone[];
    value_proposition: string;
    preferred_words: string;
    forbidden_words: string;
    primary_color: string;
    secondary_color: string;
    content_locale?: "es" | "en" | "pt";
  };
  onChange: (field: string, value: unknown) => void;
  showContentLocale?: boolean;
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

export function StepBrand({ data, onChange, showContentLocale = false }: Props) {
  const locale = useInterfaceLocale();
  const copy = surfaceCopy[locale].onboarding;
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
        {copy.brandTitle}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <fieldset>
          <legend>{copy.tones} *</legend>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
          >
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
                {optionLabel(locale, "tone", t.value) || t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="brand-value-prop">{copy.proposition} *</label>
          <textarea
            id="brand-value-prop"
            value={data.value_proposition}
            onChange={(e) => onChange("value_proposition", e.target.value)}
            required
            maxLength={500}
            rows={3}
            placeholder={copy.propositionPlaceholder}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </div>
        <div>
          <label htmlFor="brand-preferred">{copy.preferred}</label>
          <input
            id="brand-preferred"
            type="text"
            value={data.preferred_words}
            onChange={(e) => onChange("preferred_words", e.target.value)}
            placeholder={copy.wordsPlaceholder}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </div>
        <div>
          <label htmlFor="brand-forbidden">{copy.forbidden}</label>
          <input
            id="brand-forbidden"
            type="text"
            value={data.forbidden_words}
            onChange={(e) => onChange("forbidden_words", e.target.value)}
            placeholder={copy.wordsPlaceholder}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <label htmlFor="brand-primary-color">{copy.primaryColor}</label>
            <input
              id="brand-primary-color"
              type="color"
              value={data.primary_color || "#541787"}
              onChange={(e) => onChange("primary_color", e.target.value)}
              style={{ display: "block", marginTop: 4 }}
            />
          </div>
          <div>
            <label htmlFor="brand-secondary-color">{copy.secondaryColor}</label>
            <input
              id="brand-secondary-color"
              type="color"
              value={data.secondary_color || "#B79CFA"}
              onChange={(e) => onChange("secondary_color", e.target.value)}
              style={{ display: "block", marginTop: 4 }}
            />
          </div>
        </div>
        {showContentLocale ? (
          <label htmlFor="brand-content-locale">
            {copy.contentLocale}
            <select
              id="brand-content-locale"
              value={data.content_locale || "es"}
              onChange={(e) => onChange("content_locale", e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4 }}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </label>
        ) : null}
      </div>
    </section>
  );
}
