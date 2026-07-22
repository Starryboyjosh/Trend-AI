"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { GeneratedSocialPost } from "@/types/artifact";

interface ProjectData {
  id: string;
  name: string;
  platform: string;
  status: string;
  artifact_snapshot?: GeneratedSocialPost | null;
  created_at: string | null;
}

export default function ProjectEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    hook: "",
    caption: "",
    call_to_action: "",
    hashtags: "",
    visual_direction: "",
    format_recommendation: "static_post",
  });

  const loadProject = useCallback(async () => {
    setError("");
    try {
      const data = (await api.projects.get(
        params.id
      )) as unknown as ProjectData;
      setProject(data);
      const snap = data.artifact_snapshot;
      if (snap) {
        setForm({
          hook: snap.hook,
          caption: snap.caption,
          call_to_action: snap.call_to_action,
          hashtags: snap.hashtags.join(", "),
          visual_direction: snap.visual_direction,
          format_recommendation: snap.format_recommendation,
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar el proyecto.");
      }
    }
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    void loadProject();
  }, [loadProject, params.id]);

  const handleChange = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  async function handleSave() {
    if (!project) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const hashtags = form.hashtags
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);
      await api.projects.updateArtifactVersion(project.id, {
        hook: form.hook,
        caption: form.caption,
        call_to_action: form.call_to_action,
        hashtags,
        visual_direction: form.visual_direction,
        format_recommendation: form.format_recommendation,
      });
      setSuccess("Cambios guardados ✓");
      setEditing(false);
      await loadProject();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al guardar los cambios.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (!project) return;
    setError("");
    try {
      const payload = await api.projects.export(project.id);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "proyecto"}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess("Exportación preparada ✓");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No pudimos exportar el proyecto."
      );
    }
  }

  if (!project) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--muted-foreground)",
        }}
      >
        {error || "Cargando proyecto..."}
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "32px 24px",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <div>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "none",
              border: "none",
              color: "var(--primary)",
              cursor: "pointer",
              padding: 0,
              marginBottom: 8,
              display: "block",
            }}
          >
            &larr; Volver
          </button>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.6rem",
              margin: 0,
              color: "var(--foreground)",
            }}
          >
            {project.name}
          </h1>
          <p style={{ color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            {project.platform}
          </p>
        </div>
        <span
          style={{
            fontSize: "0.8rem",
            padding: "4px 12px",
            borderRadius: "var(--radius-pill)",
            background:
              project.status === "active"
                ? "var(--surface-elevated)"
                : "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          {project.status === "active" ? "Activo" : "Archivado"}
        </span>
        <button
          type="button"
          onClick={handleExport}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface)",
            color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          Exportar JSON
        </button>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: "var(--radius-md)",
            marginBottom: 16,
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "12px 16px",
            background: "#f0fdf4",
            color: "#15803d",
            borderRadius: "var(--radius-md)",
            marginBottom: 16,
            border: "1px solid #bbf7d0",
          }}
        >
          {success}
        </div>
      )}

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Field
            label="Gancho"
            value={form.hook}
            onChange={(v) => handleChange("hook", v)}
            editing={editing}
          />
          <Field
            label="Texto principal"
            value={form.caption}
            onChange={(v) => handleChange("caption", v)}
            editing={editing}
            multiline
          />
          <Field
            label="Llamado a la acción"
            value={form.call_to_action}
            onChange={(v) => handleChange("call_to_action", v)}
            editing={editing}
          />
          <Field
            label="Hashtags"
            value={form.hashtags}
            onChange={(v) => handleChange("hashtags", v)}
            editing={editing}
          />
          <Field
            label="Dirección visual"
            value={form.visual_direction}
            onChange={(v) => handleChange("visual_direction", v)}
            editing={editing}
            multiline
          />
          <Field
            label="Formato"
            value={form.format_recommendation}
            onChange={(v) => handleChange("format_recommendation", v)}
            editing={editing}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 24,
            justifyContent: "flex-end",
          }}
        >
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  const snap = project.artifact_snapshot;
                  if (snap) {
                    setForm({
                      hook: snap.hook,
                      caption: snap.caption,
                      call_to_action: snap.call_to_action,
                      hashtags: snap.hashtags.join(", "),
                      visual_direction: snap.visual_direction,
                      format_recommendation: snap.format_recommendation,
                    });
                  }
                }}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface)",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  border: 0,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--gradient-primary)",
                  color: "var(--primary-foreground)",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                padding: "10px 24px",
                border: 0,
                borderRadius: "var(--radius-sm)",
                background: "var(--gradient-primary)",
                color: "var(--primary-foreground)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Editar contenido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  editing,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "var(--muted-foreground)",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </label>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            style={{
              display: "block",
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              font: "inherit",
              background: "var(--input)",
              color: "var(--foreground)",
            }}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              font: "inherit",
              background: "var(--input)",
              color: "var(--foreground)",
            }}
          />
        )
      ) : (
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{value}</p>
      )}
    </div>
  );
}
