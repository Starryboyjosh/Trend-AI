"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { Logo } from "@/components/brand/logo";
import { api } from "@/lib/api";
import { disableDemoMode, isDemoModeEnabled } from "@/lib/demo-mode";
import { routes } from "@/lib/routes";

type IconName = "studio" | "dashboard" | "templates" | "settings" | "business" | "logout" | "bell";
type NavItem = { href: string; label: string; icon: IconName };

const navigation: NavItem[] = [
  { href: routes.studioNew, label: "Studio", icon: "studio" },
  { href: routes.dashboard, label: "Dashboard", icon: "dashboard" },
  { href: routes.templates, label: "Plantillas", icon: "templates" },
  { href: routes.settings, label: "Configuración", icon: "settings" },
];

function AppIcon({ name }: { name: IconName }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "studio") return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>;
  if (name === "dashboard") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>;
  if (name === "templates") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 3v18M3 9h18"/></svg>;
  if (name === "settings") return <svg {...common}><circle cx="12" cy="12" r="3.5"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34A1.7 1.7 0 0 0 14 20.92V21h-4v-.08a1.7 1.7 0 0 0-1.03-1.52 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></svg>;
  if (name === "business") return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
  if (name === "bell") return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
  return <svg {...common}><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg>;
}

function isCurrentPath(pathname: string, href: string) {
  if (href === routes.home) return pathname === href;
  if (href === routes.studioNew) return pathname.startsWith("/studio");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function sectionLabel(pathname: string) {
  if (pathname.startsWith("/studio")) return "Studio";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/templates")) return "Plantillas";
  if (pathname.startsWith("/settings")) return "Configuración";
  if (pathname.startsWith("/onboarding")) return "Mi negocio";
  return "HiTrendy";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try { await api.auth.logout(); }
    finally {
      disableDemoMode();
      router.replace(routes.home);
      router.refresh();
    }
  }

  return (
    <ProtectedRoute>
      <div className="app-shell">
        <aside className="app-sidebar" aria-label="Navegación principal">
          <Link href={routes.home} className="brand-lockup" aria-label="HiTrendy, inicio"><Logo /></Link>
          <nav className="desktop-nav" aria-label="Secciones">
            {navigation.map((item) => {
              const current = isCurrentPath(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className="nav-link" aria-current={current ? "page" : undefined} data-active={current || undefined} data-label={item.label}>
                  <span className="nav-mark"><AppIcon name={item.icon} /></span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          {isDemoModeEnabled() ? <p className="demo-banner" role="status">Modo demo activo</p> : null}
          <div className="sidebar-footer">
            <Link href="/onboarding" className="nav-link" data-label="Mi negocio" aria-current={pathname === "/onboarding" ? "page" : undefined}>
              <span className="nav-mark"><AppIcon name="business" /></span><span className="nav-label">Mi negocio</span>
            </Link>
            <button type="button" className="nav-link nav-link-button" data-label="Cerrar sesión" onClick={logout} disabled={loggingOut}>
              <span className="nav-mark"><AppIcon name="logout" /></span><span className="nav-label">{loggingOut ? "Saliendo…" : "Cerrar sesión"}</span>
            </button>
          </div>
        </aside>

        <div className="app-main">
          <header className="app-topbar">
            <div className="app-breadcrumb"><span>HiTrendy</span><b aria-hidden="true">›</b><strong>{sectionLabel(pathname)}</strong></div>
            <div className="top-actions"><button type="button" className="top-icon-button" aria-label="Notificaciones"><AppIcon name="bell" /></button><button type="button" className="profile-button"><span>Hola, Trendy</span><b>HT</b></button></div>
          </header>
          <div className="app-content">{children}</div>
        </div>

        <nav className="mobile-nav" aria-label="Navegación móvil">
          {navigation.map((item) => {
            const current = isCurrentPath(pathname, item.href);
            return <Link key={item.href} href={item.href} className="mobile-nav-link" aria-current={current ? "page" : undefined} data-active={current || undefined}><AppIcon name={item.icon}/><span>{item.label}</span></Link>;
          })}
        </nav>
      </div>
    </ProtectedRoute>
  );
}
