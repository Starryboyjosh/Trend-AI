import type { GeneratedSocialPost, VariationKind } from "@/types/artifact";

interface Props {
  artifact: GeneratedSocialPost;
  onSave?: () => void;
  onVariation?: (kind: VariationKind) => void;
  onFeedback?: (rating: "useful" | "not_useful") => void;
}

export function GeneratedArtifactCard({
  artifact,
  onSave,
  onVariation,
  onFeedback,
}: Props) {
  return (
    <article className="artifact-card" aria-labelledby="artifact-title">
      <p className="eyebrow">PROPUESTA GENERADA</p>
      <h2 id="artifact-title">{artifact.hook}</h2>
      <section>
        <h3>Texto</h3>
        <p>{artifact.caption}</p>
      </section>
      <section>
        <h3>Llamado a la acción</h3>
        <p>{artifact.call_to_action}</p>
      </section>
      <section>
        <h3>Dirección visual</h3>
        <p>{artifact.visual_direction}</p>
      </section>
      <p>{artifact.hashtags.join(" ")}</p>
      <div className="artifact-actions">
        <button type="button" onClick={onSave}>
          Guardar proyecto
        </button>
        <button type="button" onClick={() => onVariation?.("shorter")}>
          Más corto
        </button>
        <button type="button" onClick={() => onVariation?.("more_youthful")}>
          Más juvenil
        </button>
        <button type="button" onClick={() => onVariation?.("more_professional")}>
          Más profesional
        </button>
        <button type="button" onClick={() => onVariation?.("more_friendly")}>
          Más amigable
        </button>
        <button type="button" onClick={() => onFeedback?.("useful")}>
          Útil
        </button>
        <button type="button" onClick={() => onFeedback?.("not_useful")}>
          No útil
        </button>
      </div>
      <small>
        Contenido generado como borrador. Revísalo antes de publicarlo.
      </small>
    </article>
  );
}
