"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { TemplateLibrary } from "@/components/templates/template-library";
import { api, ApiError } from "@/lib/api";
import { routes } from "@/lib/routes";
import {
  createProjectFromTemplate,
  MissingBusinessError,
} from "@/lib/template-project";
import type { Template } from "@/types/template";

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

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [view, setView] = useState<"projects" | "templates">("projects");
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    void api.projects
      .list({ status })
      .then((items) => setProjects(items as unknown as ProjectItem[]))
      .catch((reason) =>
        setError(
          reason instanceof ApiError
            ? reason.message
            : "No pudimos cargar tus proyectos."
        )
      )
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    void api.templates
      .list()
      .then((items) => setTemplates(items as unknown as Template[]))
      .catch(() => undefined);
  }, []);

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return normalized
      ? projects.filter((project) =>
          `${project.name} ${project.platform}`
            .toLocaleLowerCase("es")
            .includes(normalized)
        )
      : projects;
  }, [projects, query]);

  async function changeStatus(project: ProjectItem) {
    setBusyId(project.id);
    try {
      await api.projects.update(project.id, {
        status: project.status === "active" ? "archived" : "active",
      });
      setProjects((items) => items.filter((item) => item.id !== project.id));
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos actualizar el proyecto."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function useTemplate(template: Template) {
    setError("");
    try {
      const project = await createProjectFromTemplate(template.id);
      router.push(`/projects/${encodeURIComponent(project.id)}`);
    } catch (reason) {
      if (reason instanceof MissingBusinessError) {
        router.push("/onboarding");
        return;
      }
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos crear el proyecto desde esta plantilla."
      );
    }
  }

  return (
    <AppShell>
      <main className="app-page dashboard-page">
        <header className="dashboard-head">
          <div>
            <p className="eyebrow">DASHBOARD</p>
            <h1>Tu espacio creativo</h1>
            <p>
              Organiza proyectos y encuentra una plantilla para tu próxima idea.
            </p>
          </div>
          <div
            className="dashboard-tabs"
            role="tablist"
            aria-label="Contenido del dashboard"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "projects"}
              onClick={() => setView("projects")}
            >
              Proyectos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "templates"}
              onClick={() => setView("templates")}
            >
              Plantillas
            </button>
          </div>
        </header>
        <section className="dashboard-hero">
          <div className="dashboard-hero-rail" aria-hidden="true">
            <Image src="/templates/flores.png" alt="" width={92} height={122} />
            <Image src="/templates/coffee.png" alt="" width={92} height={122} />
            <Image src="/templates/amor.png" alt="" width={92} height={122} />
          </div>
          <p className="eyebrow">EMPIEZA A DISEÑAR</p>
          <h2>
            {view === "projects"
              ? "Todo tu contenido, en un solo lugar."
              : "Elige una base y hazla completamente tuya."}
          </h2>
          <p>
            {view === "projects"
              ? "Retoma una campaña, organiza tus borradores o continúa el trabajo pendiente."
              : "Usa una plantilla como punto de partida y personalízala con ayuda del Studio."}
          </p>
          <Link href={routes.studioNew} className="button-secondary">
            Crear con HiTrendy <span aria-hidden="true">→</span>
          </Link>
        </section>
        {view === "templates" ? (
          <TemplateLibrary templates={templates} onUse={useTemplate} />
        ) : (
          <>
            <div className="content-title dashboard-project-title"><h2>Tus proyectos</h2></div>
            <div className="dashboard-toolbar">
              <div role="tablist" aria-label="Estado de proyectos">
                {(["active", "archived"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={status === value}
                    className="filter-tab"
                    onClick={() => setStatus(value)}
                  >
                    {value === "active" ? "Activos" : "Archivados"}
                  </button>
                ))}
              </div>
              <label className="search-field" htmlFor="project-search">
                Buscar proyectos
                <input
                  id="project-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nombre o plataforma"
                />
              </label>
            </div>
            {error ? (
              <p className="page-error" role="alert">
                {error}
              </p>
            ) : null}
            {loading ? (
              <div className="folder-grid" aria-label="Cargando proyectos">
                {[0, 1, 2].map((index) => (
                  <article
                    className="folder-card folder-card--loading"
                    key={index}
                  >
                    <span className="skeleton-line" />
                    <span className="skeleton-line skeleton-line--short" />
                  </article>
                ))}
              </div>
            ) : null}
            {!loading && !error && filteredProjects.length === 0 ? (
              <section className="empty-state">
                <h2>
                  {projects.length
                    ? "No encontramos proyectos"
                    : `No hay proyectos ${status === "archived" ? "archivados" : "todavía"}`}
                </h2>
                <p>
                  {projects.length
                    ? "Prueba otra búsqueda."
                    : "Crea tu primer borrador desde una plantilla o desde cero."}
                </p>
                {!projects.length ? (
                  <Link href={routes.templates} className="button-primary">
                    Comenzar a crear
                  </Link>
                ) : null}
              </section>
            ) : null}
            <section className="folder-grid" aria-label="Lista de proyectos">
              {filteredProjects.map((project) => (
                <article className="folder-card" key={project.id}>
                  <div className="folder-art" aria-hidden="true">
                    <Image
                      src="/icons/folder-violet-papirus-hitrendy.svg"
                      alt=""
                      width={128}
                      height={128}
                    />
                    <span>{project.artifact_snapshot?.hook ? 1 : 0}</span>
                  </div>
                  <div className="folder-card-copy">
                    <Link href={`/projects/${project.id}`}>
                      <h2>{project.name}</h2>
                    </Link>
                    <p>
                      {project.platform} · Actualizado{" "}
                      {dateLabel(project.updated_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button-secondary button-small"
                    onClick={() => changeStatus(project)}
                    disabled={busyId === project.id}
                  >
                    {busyId === project.id
                      ? "Guardando…"
                      : project.status === "active"
                        ? "Archivar"
                        : "Restaurar"}
                  </button>
                </article>
              ))}
              <Link href={routes.studioNew} className="folder-card folder-card--new">
                <span className="folder-new-plus" aria-hidden="true">+</span>
                <strong>Nuevo proyecto</strong>
                <small>Organiza una campaña</small>
              </Link>
            </section>
            <section className="dashboard-recommended">
              <div className="content-title">
                <h2>Plantillas recomendadas</h2>
                <Link href={routes.templates}>Ver todas</Link>
              </div>
              <TemplateLibrary
                templates={templates.slice(0, 4)}
                onUse={useTemplate}
                compact
              />
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
