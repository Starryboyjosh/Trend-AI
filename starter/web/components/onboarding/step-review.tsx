"use client";

import type { BusinessFormData } from "@/components/onboarding/step-business";
import type { Objective, Platform } from "@/types/business";
import type { Tone } from "@/types/brand";

interface Props {
  business: BusinessFormData;
  channels: {
    preferred_platforms: Platform[];
    primary_objective: Objective | "";
  };
  brand: {
    voice_tones: Tone[];
    value_proposition: string;
    preferred_words: string;
    forbidden_words: string;
    primary_color: string;
    secondary_color: string;
    content_locale: "es" | "en" | "pt";
  };
  confirmed: boolean;
  onConfirm: (confirmed: boolean) => void;
  submitting: boolean;
}

export function StepReview({
  business,
  channels,
  brand,
  confirmed,
  onConfirm,
  submitting,
}: Props) {
  return (
    <section aria-labelledby="review-step-title">
      <h2 id="review-step-title">Revisa tu información</h2>
      <p className="onboarding-step-description">
        Esto es lo que entendimos de tu negocio. Podrás editarlo después desde
        Configuración.
      </p>
      <div className="onboarding-review-grid">
        <ReviewCard title="Negocio">
          <ReviewRow label="Nombre" value={business.name} />
          <ReviewRow label="Categoría" value={business.category} />
          <ReviewRow
            label="Ubicación"
            value={[business.city, business.country].filter(Boolean).join(", ")}
          />
          <ReviewRow label="Producto o servicio" value={business.primary_product} />
          <ReviewRow label="Audiencia" value={business.target_audience} />
          <ReviewRow label="Sitio web" value={business.website_url || "—"} />
        </ReviewCard>
        <ReviewCard title="Canales y objetivo">
          <ReviewRow
            label="Canales"
            value={channels.preferred_platforms.join(", ")}
          />
          <ReviewRow label="Objetivo" value={channels.primary_objective} />
        </ReviewCard>
        <ReviewCard title="Marca">
          <ReviewRow label="Tonos" value={brand.voice_tones.join(", ")} />
          <ReviewRow label="Propuesta" value={brand.value_proposition} />
          <ReviewRow label="Idioma del contenido" value={brand.content_locale} />
          <ReviewRow label="Palabras preferidas" value={brand.preferred_words || "—"} />
          <ReviewRow label="Palabras prohibidas" value={brand.forbidden_words || "—"} />
        </ReviewCard>
      </div>
      <label className="onboarding-confirmation">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirm(event.target.checked)}
        />
        Confirmo que la información es correcta.
      </label>
      <button type="submit" disabled={submitting || !confirmed}>
        {submitting ? "Finalizando…" : "Finalizar y entrar a HiTrendy"}
      </button>
    </section>
  );
}

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="onboarding-review-card">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="onboarding-review-row">
      <strong>{label}</strong>
      <span>{value || "—"}</span>
    </div>
  );
}
