"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { api, ApiError } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  platform: string;
  created_at: string | null;
}

export default function Home() {
  const router = useRouter();
  const [hasBusiness, setHasBusiness] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrivateHome() {
      try {
        await api.auth.me();
        const [businesses, projectList] = await Promise.all([
          api.businesses.list(),
          api.projects.list(),
        ]);
        setHasBusiness(businesses.length > 0);
        setProjects(projectList as unknown as Project[]);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    }
    void loadPrivateHome();
  }, [router]);

  return (
    <AppShell>
      <main className="app-page home-page">
        <section className="home-hero">
          <h1>Comienza a Crear</h1>
          <div className="home-hero-collage" aria-hidden="true">
            <Image
              src="/figma/home/hero-collage.png"
              alt=""
              width={1064}
              height={380}
              priority
            />
          </div>
          <Link href="/assistant" className="home-start-button">
            Comenzar
          </Link>
        </section>

        {loading ? <p className="page-intro">Preparando tu espacio…</p> : null}

        {!loading && !hasBusiness ? (
          <section className="setup-callout surface-card">
            <div>
              <p className="eyebrow">PRIMER PASO</p>
              <h2>Configura tu negocio</h2>
              <p>
                Para personalizar tus resultados necesitamos conocer algunos
                datos de tu negocio.
              </p>
            </div>
            <Link href="/onboarding" className="button-primary">
              Configurar mi negocio
            </Link>
          </section>
        ) : null}

        {!loading && hasBusiness ? (
          <>
            <section
              className="recent-projects"
              aria-labelledby="recent-projects-title"
            >
              <div className="section-heading">
                <h2 id="recent-projects-title">Tus Proyectos</h2>
                <Link href="/projects">Ver todos</Link>
              </div>
              {projects.length ? (
                <div className="recent-project-grid">
                  {projects.slice(0, 4).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="recent-project-card"
                    >
                      <Image
                        src="/figma/home/project-folder.png"
                        alt=""
                        width={234}
                        height={166}
                        aria-hidden="true"
                      />
                      <span className="project-platform">
                        {project.platform}
                      </span>
                      <strong>{project.name}</strong>
                      <small>
                        {project.created_at
                          ? new Intl.DateTimeFormat("es", {
                              day: "numeric",
                              month: "short",
                            }).format(new Date(project.created_at))
                          : "Borrador"}
                      </small>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-projects surface-card">
                  <Image
                    src="/figma/home/project-folder.png"
                    alt=""
                    width={234}
                    height={166}
                    aria-hidden="true"
                  />
                  <p>Aún no tienes proyectos guardados.</p>
                  <Link href="/assistant" className="button-secondary">
                    Crear mi primer borrador
                  </Link>
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </AppShell>
  );
}
