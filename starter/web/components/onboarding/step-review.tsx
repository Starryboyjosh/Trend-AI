"use client";

interface Props {
  business: Record<string, unknown>;
  brand: Record<string, unknown>;
  submitting: boolean;
}

export function StepReview({ business, brand, submitting }: Props) {
  return (
    <section>
      <h2 style={{ fontFamily: "var(--font-heading)", marginTop: 0 }}>
        Revisa tu información
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card label="Negocio">
          <Row label="Nombre" value={business.name as string} />
          <Row label="Categoría" value={business.category as string} />
          <Row label="País" value={business.country as string} />
          <Row label="Ciudad" value={business.city as string} />
          <Row
            label="Producto principal"
            value={business.primary_product as string}
          />
          <Row
            label="Audiencia objetivo"
            value={business.target_audience as string}
          />
          <Row
            label="Plataformas"
            value={(business.preferred_platforms as string[])?.join(", ")}
          />
          <Row label="Objetivo" value={business.primary_objective as string} />
        </Card>
        <Card label="Marca">
          <Row
            label="Tonos de voz"
            value={(brand.voice_tones as string[])?.join(", ")}
          />
          <Row
            label="Propuesta de valor"
            value={brand.value_proposition as string}
          />
          <Row
            label="Palabras preferidas"
            value={(brand.preferred_words as string) || "—"}
          />
          <Row
            label="Palabras prohibidas"
            value={(brand.forbidden_words as string) || "—"}
          />
        </Card>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "14px 24px",
            background: "var(--gradient-primary)",
            color: "var(--primary-foreground)",
            border: 0,
            borderRadius: "var(--radius-md)",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Guardando..." : "Guardar y continuar"}
        </button>
      </div>
    </section>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: 16,
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontFamily: "var(--font-heading)" }}>
        {label}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid var(--border)",
        fontSize: "0.9rem",
      }}
    >
      <strong>{label}</strong>
      <span style={{ color: "var(--muted-foreground)" }}>{value}</span>
    </div>
  );
}
