"use client";

import { useState } from "react";
import { GeneratedArtifactCard } from "@/components/generated-artifact-card";

const sample = {
  artifact_type: "social_post" as const,
  platform: "instagram" as const,
  hook: "Tu próximo antojo ya tiene nombre ✨",
  caption: "Presenta aquí una propuesta personalizada por HiTrendy.",
  call_to_action: "Visítanos y conócela.",
  hashtags: ["#HiTrendy", "#ContenidoParaNegocios"],
  visual_direction:
    "Producto en primer plano, preparación y ambiente del negocio.",
  format_recommendation: "reel" as const,
  assumptions: [],
};

export default function Home() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar - Dark theme */}
      <aside
        data-theme="dark-shell"
        style={{
          width: sidebarExpanded ? 240 : 72,
          background: "var(--background)",
          color: "var(--foreground)",
          borderRight: "1px solid var(--border)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease-out",
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
          {/* Logo representation */}
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
            👋
          </div>
          {sidebarExpanded && (
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "1.2rem",
              }}
            >
              HiTrendy
            </span>
          )}
        </div>

        <nav
          style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}
        >
          {[
            { label: "Dashboard", icon: "📊" },
            { label: "Crear Contenido", icon: "✍️", active: true },
            { label: "Plantillas", icon: "🎨" },
            { label: "Biblioteca", icon: "📁" },
            { label: "Ajustes", icon: "⚙️" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: item.active
                  ? "var(--surface-elevated)"
                  : "transparent",
                color: item.active
                  ? "var(--primary)"
                  : "var(--muted-foreground)",
                border: 0,
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                fontWeight: item.active ? 600 : 400,
              }}
            >
              <span>{item.icon}</span>
              {sidebarExpanded && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            padding: "8px",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            marginTop: "auto",
          }}
        >
          {sidebarExpanded ? "◀ Colapsar" : "▶"}
        </button>
      </aside>

      {/* Main Content Area - Light theme */}
      <main
        style={{
          flex: 1,
          padding: "32px",
          background: "var(--background)",
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
            <p
              style={{ color: "var(--muted-foreground)", margin: "4px 0 0 0" }}
            >
              Crea y optimiza publicaciones en segundos.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}
            >
              Mi Negocio
            </span>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-pill)",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            >
              U
            </div>
          </div>
        </header>

        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "24px",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.5rem",
                marginTop: 0,
              }}
            >
              Última Generación
            </h2>
            <p style={{ color: "var(--muted-foreground)", marginBottom: 24 }}>
              Esta es una propuesta personalizada basada en tu perfil de marca.
            </p>
            <GeneratedArtifactCard artifact={sample} />
          </div>
        </div>
      </main>
    </div>
  );
}
