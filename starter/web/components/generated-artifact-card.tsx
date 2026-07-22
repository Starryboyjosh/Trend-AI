import { useId, useState } from "react";
import type { GeneratedSocialPost, VariationKind } from "@/types/artifact";

interface Props {
  artifact: GeneratedSocialPost;
  onSave?: () => void;
  onVariation?: (kind: VariationKind) => void;
  onFeedback?: (rating: "useful" | "not_useful") => void;
  onCopy?: () => void;
}

export function GeneratedArtifactCard({
  artifact,
  onSave,
  onVariation,
  onFeedback,
  onCopy,
}: Props) {
  const titleId = useId();
  const [copyStatus, setCopyStatus] = useState("");

  async function copyArtifact() {
    try {
      await navigator.clipboard.writeText(
        [
          artifact.hook,
          artifact.caption,
          artifact.call_to_action,
          artifact.hashtags.join(" "),
          `Dirección visual: ${artifact.visual_direction}`,
        ]
          .filter(Boolean)
          .join("\n\n")
      );
      setCopyStatus("Contenido copiado.");
      onCopy?.();
    } catch {
      setCopyStatus("No pudimos copiar el contenido. Selecciónalo y cópialo manualmente.");
    }
  }

  return (
    <article className="artifact-card" aria-labelledby={titleId}>
      <p className="eyebrow">PROPUESTA GENERADA</p>
      <h2 id={titleId}>{artifact.hook}</h2>
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
        <button type="button" onClick={() => void copyArtifact()}>
          Copiar contenido
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
      <p role="status" aria-live="polite" style={{ minHeight: "1.2em", margin: "8px 0 0" }}>
        {copyStatus}
      </p>
      <small>
        Contenido generado como borrador. Revísalo antes de publicarlo.
      </small>
    </article>
  );
}
