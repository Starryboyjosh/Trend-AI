"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PublicAuthRoute } from "@/components/auth/public-auth-route";
import { api, ApiError } from "@/lib/api";
import { resolveNextPath, routes } from "@/lib/routes";
import { surfaceCopy, useInterfaceLocale } from "@/lib/i18n";

function LoginForm() {
  const router = useRouter();
  const copy = surfaceCopy[useInterfaceLocale()].auth;
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const next = resolveNextPath(searchParams.get("next"));
  const oauthError = {
    cancelled: "Cancelaste el acceso con Google. Puedes intentarlo de nuevo.",
    invalid_state: "La verificación con Google no pudo completarse. Inténtalo de nuevo.",
    expired_state: "La verificación con Google expiró. Inténtalo de nuevo.",
    used_state: "Este acceso con Google ya fue utilizado. Inténtalo de nuevo.",
    unavailable: "Google no está disponible en este momento.",
    account_exists:
      "Ya existe una cuenta con este correo. Inicia sesión con tu método habitual.",
    failed: "No pudimos completar el acceso con Google. Inténtalo de nuevo.",
  }[searchParams.get("oauth") || ""];

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
          : copy.loginFallback
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-frame">
        <section
          className="auth-panel"
          aria-label={copy.demoLabel}
        >
          <Logo inverse />
          <h2>{copy.heroTitle}</h2>
          <p>{copy.heroLead}</p>
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
          <h1 id="auth-title">{copy.welcome}</h1>
          <p className="auth-description">
            {copy.loginLead}
          </p>
          {oauthError ? (
            <p role="alert" className="auth-error">
              {oauthError}
            </p>
          ) : null}
          <GoogleSignInButton />
          <div className="auth-divider" aria-hidden="true">
            <span>{copy.divider}</span>
          </div>
          <form onSubmit={submit} className="auth-form">
            <label htmlFor="email">
              {copy.email}
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
              {copy.password}
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
              {submitting ? copy.loggingIn : copy.login}
            </button>
          </form>
          <p className="auth-register-prompt">
            {copy.noAccount} <Link href={routes.register}>{copy.registerLink}</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <PublicAuthRoute>
      <Suspense
        fallback={
          <main className="route-status">{surfaceCopy.es.auth.loginLoading}</main>
        }
      >
        <LoginForm />
      </Suspense>
    </PublicAuthRoute>
  );
}
