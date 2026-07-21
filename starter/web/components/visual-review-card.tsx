"use client";

interface Improvement {
  priority: "high" | "medium" | "low";
  area: string;
  reason: string;
  action: string;
}

interface Analysis {
  id: string;
  summary: string;
  strengths: string[];
  improvements: Improvement[];
  revised_copy: string | null;
  accessibility_notes: string[];
}

interface Props {
  analysis: Analysis;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "#b91c1c",
  medium: "#9a6100",
  low: "#625b70",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const AREA_LABELS: Record<string, string> = {
  message: "Mensaje",
  hierarchy: "Jerarquía",
  readability: "Legibilidad",
  brand: "Marca",
  cta: "Llamado a la acción",
  platform: "Plataforma",
  accessibility: "Accesibilidad",
};

export function VisualReviewCard({ analysis }: Props) {
  return (
    <article
      className="artifact-card"
      style={{ marginTop: 12 }}
      aria-labelledby="analysis-title"
    >
      <p className="eyebrow">ANÁLISIS VISUAL</p>

      <section>
        <h3 id="analysis-title">Resumen</h3>
        <p>{analysis.summary}</p>
      </section>

      <section>
        <h3>Lo que funciona</h3>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {analysis.strengths.map((s, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Prioridades de mejora</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {analysis.improvements.map((imp, i) => (
            <div
              key={i}
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <strong style={{ fontSize: "0.85rem" }}>
                  {AREA_LABELS[imp.area] || imp.area}
                </strong>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-pill)",
                    background: PRIORITY_COLORS[imp.priority] + "20",
                    color: PRIORITY_COLORS[imp.priority],
                  }}
                >
                  {PRIORITY_LABELS[imp.priority]}
                </span>
              </div>
              <p style={{ margin: "0 0 4px", fontSize: "0.85rem" }}>
                {imp.reason}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--primary)",
                }}
              >
                {imp.action}
              </p>
            </div>
          ))}
        </div>
      </section>

      {analysis.revised_copy && (
        <section>
          <h3>Texto revisado</h3>
          <p>{analysis.revised_copy}</p>
        </section>
      )}

      {analysis.accessibility_notes.length > 0 && (
        <section>
          <h3>Accesibilidad</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {analysis.accessibility_notes.map((note, i) => (
              <li key={i} style={{ marginBottom: 4, fontSize: "0.85rem" }}>
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
