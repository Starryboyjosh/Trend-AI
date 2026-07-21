"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  platform: string;
  status: string;
  created_at: string | null;
  artifact_snapshot?: {
    hook?: string;
    platform?: string;
  } | null;
}

export default function Home() {
  const [hasBusiness, setHasBusiness] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.businesses.list().then((list) => setHasBusiness(list.length > 0)),
      api.projects.list().then((list) => setProjects(list as unknown as Project[])),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        data-theme="dark-shell"
        style={{
          width: 240,
          background: "var(--background)",
          color: "var(--foreground)",
          borderRight: "1px solid var(--border)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-sm)",
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              color: "var(--primary-foreground)",
            }}
          >
            H
          </div>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: "1.2rem",
            }}
          >
            HiTrendy
          </span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <Link
            href="/assistant"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              color: "var(--primary)",
              background: "var(--surface-elevated)",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Asistente
          </Link>
          <Link
            href="/templates"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              color: "var(--muted-foreground)",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
            }}
          >
            Plantillas
          </Link>
          <Link
            href="/library"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              color: "var(--muted-foreground)",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
            }}
          >
            Biblioteca
          </Link>
          <Link
            href="/onboarding"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              color: "var(--muted-foreground)",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
            }}
          >
            Configurar negocio
          </Link>
        </nav>
      </aside>

      <main
        style={{
          flex: 1,
          padding: "32px",
          background: "var(--background)",
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
            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "2rem",
                margin: 0,
                color: "var(--foreground)",
              }}
            >
              Asistente de Contenido
            </h1>
            <p style={{ color: "var(--muted-foreground)", margin: "4px 0 0 0" }}>
              Crea y optimiza publicaciones en segundos.
            </p>
          </div>
        </header>

        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {loading ? (
            <p style={{ color: "var(--muted-foreground)" }}>Cargando…</p>
          ) : (
            <>
              {!hasBusiness && (
                <div
                  style={{
                    textAlign: "center",
                    padding: 48,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    marginBottom: 32,
                  }}
                >
                  <h2 style={{ fontFamily: "var(--font-heading)" }}>
                    Configura tu negocio
                  </h2>
                  <p style={{ color: "var(--muted-foreground)", marginBottom: 24 }}>
                    Para personalizar tus resultados necesitamos conocer algunos datos
                    de tu negocio.
                  </p>
                  <Link
                    href="/onboarding"
                    style={{
                      display: "inline-block",
                      padding: "14px 28px",
                      background: "var(--gradient-primary)",
                      color: "white",
                      borderRadius: "var(--radius-md)",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    Configurar mi negocio
                  </Link>
                </div>
              )}

              {hasBusiness && (
                <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
                  <Link
                    href="/assistant"
                    style={{
                      flex: 1,
                      padding: "24px",
                      background: "var(--gradient-primary)",
                      color: "white",
                      borderRadius: "var(--radius-lg)",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: "1.2rem",
                      textAlign: "center",
                    }}
                  >
                    Ir al asistente
                  </Link>
                  <Link
                    href="/templates"
                    style={{
                      flex: 1,
                      padding: "24px",
                      background: "var(--surface)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: "1.2rem",
                      textAlign: "center",
                    }}
                  >
                    Explorar plantillas
                  </Link>
                </div>
              )}

              {projects.length > 0 && (
                <section>
                  <h2
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "1.3rem",
                      marginBottom: 16,
                      color: "var(--foreground)",
                    }}
                  >
                    Proyectos recientes
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {projects.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        style={{
                          padding: "16px 20px",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <strong style={{ color: "var(--foreground)" }}>
                            {p.name}
                          </strong>
                          <span
                            style={{
                              marginLeft: 12,
                              fontSize: "0.85rem",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {p.platform}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Link
                            href={`/projects/${p.id}`}
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--primary)",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            Editar
                          </Link>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {p.created_at
                              ? new Date(p.created_at).toLocaleDateString("es-MX", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
