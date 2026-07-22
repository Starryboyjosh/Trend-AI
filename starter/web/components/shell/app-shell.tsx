"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  mark: string;
};

const navigation: NavItem[] = [
  { href: "/", label: "Inicio", mark: "⌂" },
  { href: "/assistant", label: "Nuevo chat", mark: "✦" },
  { href: "/conversations", label: "Conversaciones", mark: "⌕" },
  { href: "/templates", label: "Plantillas", mark: "▧" },
  { href: "/projects", label: "Proyectos", mark: "◇" },
  { href: "/library", label: "Biblioteca", mark: "▣" },
];

function isCurrentPath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside
        className="app-sidebar"
        data-theme="dark-shell"
        aria-label="Navegacion principal"
      >
        <Link href="/" className="brand-lockup" aria-label="HiTrendy, inicio">
          <span className="brand-mark" aria-hidden="true">
            <Image
              src="/brand/hitrendy-mark.svg"
              alt=""
              width={38}
              height={38}
              priority
            />
          </span>
          <span className="brand-name">HiTrendy</span>
        </Link>

        <nav className="desktop-nav" aria-label="Secciones">
          {navigation.map((item) => {
            const current = isCurrentPath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                aria-current={current ? "page" : undefined}
                data-active={current || undefined}
              >
                <span className="nav-mark" aria-hidden="true">
                  {item.mark}
                </span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link
            href="/onboarding"
            className="nav-link"
            aria-current={pathname === "/onboarding" ? "page" : undefined}
          >
            <span className="nav-mark" aria-hidden="true">
              ◎
            </span>
            <span className="nav-label">Mi negocio</span>
          </Link>
          <Link
            href="/settings"
            className="nav-link"
            aria-current={pathname === "/settings" ? "page" : undefined}
          >
            <span className="nav-mark" aria-hidden="true">
              ⚙
            </span>
            <span className="nav-label">Ajustes</span>
          </Link>
        </div>
      </aside>

      <div className="app-content">{children}</div>

      <nav className="mobile-nav" aria-label="Navegacion movil">
        {navigation.slice(0, 5).map((item) => {
          const current = isCurrentPath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="mobile-nav-link"
              aria-current={current ? "page" : undefined}
              data-active={current || undefined}
            >
              <span aria-hidden="true">{item.mark}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
