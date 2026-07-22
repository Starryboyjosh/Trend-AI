import type { GeneratedShortVideoScript } from "@/types/artifact";

interface Props {
  artifact: GeneratedShortVideoScript;
  onSave?: () => void;
  onFeedback?: (rating: "useful" | "not_useful") => void;
}

export function GeneratedVideoScriptCard({ artifact, onSave, onFeedback }: Props) {
  return (
    <article className="artifact-card" aria-labelledby="video-script-title">
      <p className="eyebrow">GUION DE VIDEO · {artifact.duration_seconds} SEG</p>
      <h2 id="video-script-title">{artifact.hook}</h2>
      <ol style={{ paddingLeft: 20, margin: "12px 0" }}>
        {artifact.scenes.map((scene) => (
          <li key={scene.order} style={{ marginBottom: 14 }}>
            <strong>Escena {scene.order} · {scene.duration_seconds} seg</strong>
            <p><strong>Visual:</strong> {scene.visual}</p>
            <p><strong>En pantalla:</strong> {scene.on_screen_text}</p>
            <p><strong>Locución:</strong> {scene.voiceover}</p>
          </li>
        ))}
      </ol>
      <section>
        <h3>Llamado a la acción</h3>
        <p>{artifact.call_to_action}</p>
      </section>
      <section>
        <h3>Caption sugerido</h3>
        <p>{artifact.caption}</p>
      </section>
      <div className="artifact-actions">
        <button type="button" onClick={onSave}>
          Guardar proyecto
        </button>
        <button type="button" onClick={() => onFeedback?.("useful")}>
          Útil
        </button>
        <button type="button" onClick={() => onFeedback?.("not_useful")}>
          No útil
        </button>
      </div>
      <small>
        Guion generado como borrador. Revísalo y ajústalo antes de grabar o publicar.
      </small>
    </article>
  );
}
