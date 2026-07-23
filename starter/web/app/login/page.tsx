"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { api, ApiError } from "@/lib/api";
import { enableDemoMode } from "@/lib/demo-mode";
import { resolveNextPath, routes } from "@/lib/routes";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const next = resolveNextPath(searchParams.get("next"));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.auth.login({ email, password });
      router.replace(next);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos iniciar sesión."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function enterDemoMode() {
    enableDemoMode();
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="auth-page">
      <div className="auth-frame">
        <section
          className="auth-panel"
          aria-label="Contenido de ejemplo de HiTrendy"
        >
          <Logo inverse />
          <h2>Convierte una idea en algo que la gente quiera compartir.</h2>
          <p>
            Publicaciones, campañas y guiones que parten de la identidad de tu
            negocio.
          </p>
          <div className="auth-visual-rail" aria-hidden="true">
            <Image
              src="/templates/flores.png"
              alt=""
              width={170}
              height={212}
            />
            <Image
              src="/templates/coffee.png"
              alt=""
              width={170}
              height={212}
            />
            <Image src="/templates/amor.png" alt="" width={170} height={212} />
          </div>
        </section>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-brand">
            <Logo />
          </div>
          <h1 id="auth-title">Bienvenido de vuelta</h1>
          <p className="auth-description">
            Ingresa tus datos para seguir creando.
          </p>
          <form onSubmit={submit} className="auth-form">
            <label htmlFor="email">
              Correo electrónico
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label htmlFor="password">
              Contraseña
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            {error ? (
              <p role="alert" className="auth-error">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={submitting}>
              {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
            </button>
          </form>
          <button
            type="button"
            className="button-secondary auth-demo-button"
            onClick={enterDemoMode}
          >
            Entrar en modo demo
          </button>
          <p className="auth-register-prompt">
            ¿No tienes cuenta? <Link href={routes.register}>Regístrate</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="route-status">Preparando inicio de sesión…</main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
