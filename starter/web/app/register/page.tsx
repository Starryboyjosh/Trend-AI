"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { PublicAuthRoute } from "@/components/auth/public-auth-route";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Logo } from "@/components/brand/logo";
import { api, ApiError } from "@/lib/api";
import { routes } from "@/lib/routes";
import { readStoredLocale, setStoredLocale, surfaceCopy, useInterfaceLocale } from "@/lib/i18n";

type InterfaceLocale = "es" | "en" | "pt";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    inviteCode: "",
    interfaceLocale: readStoredLocale() as InterfaceLocale,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const copy = surfaceCopy[useInterfaceLocale()].auth;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.auth.signup.start({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        interface_locale: form.interfaceLocale,
        invite_code: form.inviteCode.trim() || undefined,
      });
      router.replace(routes.onboarding);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : copy.registerFallback
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicAuthRoute>
      <main className="auth-page auth-page--single">
        <section className="auth-card" aria-labelledby="register-title">
        <div className="auth-brand">
          <Logo />
        </div>
        <h1 id="register-title">{copy.register}</h1>
        <p className="auth-description">
          {copy.registerLead}
        </p>
        <GoogleSignInButton />
        <div className="auth-divider" aria-hidden="true">
          <span>{copy.divider}</span>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="name">
            {copy.name}
            <input
              id="name"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              required
              autoComplete="name"
            />
          </label>
          <label htmlFor="register-email">
            {copy.email}
            <input
              id="register-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              required
              autoComplete="email"
            />
          </label>
          <label htmlFor="register-password">
            {copy.password}
            <input
              id="register-password"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              required
              minLength={12}
              autoComplete="new-password"
            />
          </label>
          <label htmlFor="invite-code">
            Código de invitación <span className="auth-field-hint">(si aplica)</span>
            <input
              id="invite-code"
              value={form.inviteCode}
              onChange={(event) =>
                setForm({ ...form, inviteCode: event.target.value })
              }
              autoComplete="one-time-code"
              placeholder="Código de beta"
            />
          </label>
          <label htmlFor="interface-locale">
            {copy.interfaceLocale}
            <select
              id="interface-locale"
              value={form.interfaceLocale}
              onChange={(event) => {
                setStoredLocale(event.target.value as InterfaceLocale);
                setForm({
                  ...form,
                  interfaceLocale: event.target.value as InterfaceLocale,
                })
              }}
            >
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
            </select>
          </label>
          {error ? (
            <p role="alert" className="auth-error">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={submitting}>
            {submitting ? copy.creating : copy.create}
          </button>
        </form>
        <p className="auth-register-prompt">
          {copy.hasAccount} <Link href={routes.login}>{copy.loginLink}</Link>
        </p>
        </section>
      </main>
    </PublicAuthRoute>
  );
}
