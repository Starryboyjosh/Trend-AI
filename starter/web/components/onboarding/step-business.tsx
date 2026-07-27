"use client";

import type { Category } from "@/types/business";

export interface BusinessFormData {
  name: string;
  category: Category | "";
  country: string;
  city: string;
  description: string;
  primary_product: string;
  target_audience: string;
  website_url: string;
}

interface Props {
  data: BusinessFormData;
  onChange: (field: keyof BusinessFormData, value: string) => void;
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
    <section aria-labelledby="business-step-title">
      <h2 id="business-step-title">Cuéntanos sobre tu negocio</h2>
      <p className="onboarding-step-description">
        Usaremos este contexto para que tus primeras recomendaciones sean útiles
        desde el inicio.
      </p>
      <div className="onboarding-fields">
        <label>
          Nombre comercial <span aria-hidden="true">*</span>
          <input
            name="business-name"
            type="text"
            value={data.name}
            onChange={(event) => onChange("name", event.target.value)}
            required
            maxLength={120}
            autoComplete="organization"
          />
        </label>
        <label>
          Categoría <span aria-hidden="true">*</span>
          <select
            name="business-category"
            value={data.category}
            onChange={(event) => onChange("category", event.target.value)}
            required
          >
            <option value="">Seleccionar…</option>
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <div className="onboarding-field-grid">
          <label>
            País <span aria-hidden="true">*</span>
            <input
              name="business-country"
              type="text"
              value={data.country}
              onChange={(event) => onChange("country", event.target.value)}
              required
              maxLength={80}
              autoComplete="country-name"
            />
          </label>
          <label>
            Ciudad <span aria-hidden="true">*</span>
            <input
              name="business-city"
              type="text"
              value={data.city}
              onChange={(event) => onChange("city", event.target.value)}
              required
              maxLength={100}
              autoComplete="address-level2"
            />
          </label>
        </div>
        <label>
          Producto o servicio principal <span aria-hidden="true">*</span>
          <input
            name="business-product"
            type="text"
            value={data.primary_product}
            onChange={(event) => onChange("primary_product", event.target.value)}
            required
            maxLength={240}
          />
        </label>
        <label>
          ¿A quién ayudas? <span aria-hidden="true">*</span>
          <textarea
            name="business-audience"
            value={data.target_audience}
            onChange={(event) => onChange("target_audience", event.target.value)}
            required
            maxLength={500}
            rows={3}
            placeholder="Ej: Personas que buscan una pausa cercana y de calidad"
          />
        </label>
        <label>
          Descripción del negocio
          <textarea
            name="business-description"
            value={data.description}
            onChange={(event) => onChange("description", event.target.value)}
            maxLength={1000}
            rows={3}
          />
        </label>
        <label>
          Sitio web <span className="onboarding-optional">Opcional</span>
          <input
            name="business-website"
            type="url"
            value={data.website_url}
            onChange={(event) => onChange("website_url", event.target.value)}
            maxLength={500}
            placeholder="https://tu-negocio.com"
            autoComplete="url"
          />
        </label>
      </div>
    </section>
  );
}
