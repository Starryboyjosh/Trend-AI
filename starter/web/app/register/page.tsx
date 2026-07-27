"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { PublicAuthRoute } from "@/components/auth/public-auth-route";
import { Logo } from "@/components/brand/logo";
import { api, ApiError } from "@/lib/api";
import { routes } from "@/lib/routes";

type InterfaceLocale = "es" | "en" | "pt";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    interfaceLocale: "es" as InterfaceLocale,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      });
      router.replace(routes.onboarding);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos crear tu cuenta."
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
        <h1 id="register-title">Crea tu cuenta</h1>
        <p className="auth-description">
          Primero creemos tu cuenta. Después conoceremos tu negocio para
          preparar tu espacio en HiTrendy.
        </p>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="name">
            Tu nombre
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
            Correo electrónico
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
            Contraseña
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
          <label htmlFor="interface-locale">
            Idioma de la interfaz
            <select
              id="interface-locale"
              value={form.interfaceLocale}
              onChange={(event) =>
                setForm({
                  ...form,
                  interfaceLocale: event.target.value as InterfaceLocale,
                })
              }
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
            {submitting ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>
        <p className="auth-register-prompt">
          ¿Ya tienes cuenta? <Link href={routes.login}>Inicia sesión</Link>
        </p>
        </section>
      </main>
    </PublicAuthRoute>
  );
}
