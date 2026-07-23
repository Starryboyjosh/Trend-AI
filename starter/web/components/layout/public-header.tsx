"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { Logo } from "@/components/brand/logo";
import { routes } from "@/lib/routes";

export function PublicHeader() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    void api.auth.me().then(() => setAuthenticated(true)).catch(() => setAuthenticated(false));
  }, []);

  const destination = authenticated ? routes.dashboard : routes.login;

  return (
    <header className="public-header">
      <Link href={routes.home} className="public-brand" aria-label="HiTrendy, inicio">
        <Logo />
      </Link>
      <nav className="public-nav" aria-label="Navegación pública">
        <a href="#crear">Crear</a>
        <a href="#plantillas">Plantillas</a>
        <a href="#nosotros">Quiénes somos</a>
      </nav>
      <div className="public-actions">
        <Link className="public-login-link" href={destination}>
          {authenticated ? "Dashboard" : "Iniciar sesión"}
        </Link>
        <Link className="button-primary button-small public-start-button" href={destination}>
          Comenzar
        </Link>
      </div>
    </header>
  );
}
