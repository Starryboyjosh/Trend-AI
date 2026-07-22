"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { api, ApiError } from "@/lib/api";

interface ProjectItem {
  id: string;
  name: string;
  platform: string;
  status: "active" | "archived";
  updated_at: string | null;
  artifact_snapshot?: { hook?: string } | null;
}

function dateLabel(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
        new Date(value)
      )
    : "Sin actividad";
}

export default function ProjectsPage() {
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setProjects(
          (await api.projects.list({ status })) as unknown as ProjectItem[]
        );
      } catch (cause) {
        setError(
          cause instanceof ApiError
            ? cause.message
            : "No pudimos cargar tus proyectos."
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [status]);

  async function updateStatus(project: ProjectItem) {
    setBusyId(project.id);
    try {
      await api.projects.update(project.id, {
        status: project.status === "active" ? "archived" : "active",
      });
      setProjects((items) => items.filter((item) => item.id !== project.id));
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No pudimos actualizar el proyecto."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(project: ProjectItem) {
    setBusyId(project.id);
    try {
      const copy = await api.projects.duplicate(project.id);
      if (status === "active")
        setProjects((items) => [copy as unknown as ProjectItem, ...items]);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No pudimos duplicar el proyecto."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell>
    <main className="app-page" style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
      <Link
        href="/"
        style={{ color: "var(--primary)", textDecoration: "none" }}
      >
        ← Inicio
      </Link>
      <header style={{ margin: "24px 0" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>
          Proyectos
        </h1>
        <p style={{ color: "var(--muted-foreground)" }}>
          Edita, duplica y organiza tus borradores de contenido.
        </p>
      </header>
      <div
        role="tablist"
        aria-label="Estado de proyectos"
        style={{ display: "flex", gap: 8, marginBottom: 20 }}
      >
        {(["active", "archived"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => setStatus(value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background:
                status === value ? "var(--surface-elevated)" : "var(--surface)",
              color: "var(--foreground)",
              cursor: "pointer",
            }}
          >
            {value === "active" ? "Activos" : "Archivados"}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" style={{ color: "var(--ht-danger)" }}>
          {error}
        </p>
      ) : null}
      {loading ? (
        <p style={{ color: "var(--muted-foreground)" }}>Cargando proyectos…</p>
      ) : null}
      {!loading && !error && projects.length === 0 ? (
        <section
          style={{
            textAlign: "center",
            padding: 48,
            color: "var(--muted-foreground)",
          }}
        >
          <p>
            No hay proyectos {status === "archived" ? "archivados" : "activos"}{" "}
            todavía.
          </p>
          <Link href="/assistant">Crear contenido con el asistente</Link>
        </section>
      ) : null}
      <section
        aria-label="Lista de proyectos"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {projects.map((project) => (
          <article
            key={project.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 20,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
            }}
          >
            <Link
              href={`/projects/${project.id}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              <strong>{project.name}</strong>
              <p style={{ color: "var(--muted-foreground)", margin: "8px 0" }}>
                {project.artifact_snapshot?.hook || "Borrador de contenido"}
              </p>
              <small style={{ color: "var(--muted-foreground)" }}>
                {project.platform} · Actualizado {dateLabel(project.updated_at)}
              </small>
            </Link>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => duplicate(project)}
                disabled={busyId === project.id}
                style={{
                  padding: "8px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                Duplicar
              </button>
              <button
                type="button"
                onClick={() => updateStatus(project)}
                disabled={busyId === project.id}
                style={{
                  padding: "8px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                {busyId === project.id
                  ? "Guardando…"
                  : project.status === "active"
                    ? "Archivar"
                    : "Restaurar"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
    </AppShell>
  );
}
