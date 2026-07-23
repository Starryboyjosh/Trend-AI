"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { LogoPlaceholder } from "@/components/placeholders/widget-placeholder";
import { api, ApiError } from "@/lib/api";
import { routes } from "@/lib/routes";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    workspaceName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.auth.register({
        email: form.email,
        password: form.password,
        name: form.name,
        workspace_name: form.workspaceName,
      });
      router.replace("/onboarding");
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
    <main className="auth-page auth-page--single">
      <section className="auth-card" aria-labelledby="register-title">
        <div className="auth-brand">
          <LogoPlaceholder />
          <span>HiTrendy</span>
        </div>
        <h1 id="register-title">Crea tu espacio de trabajo</h1>
        <p className="auth-description">
          Tus perfiles y proyectos quedarán organizados en un solo lugar.
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
          <label htmlFor="workspace">
            Nombre del espacio de trabajo
            <input
              id="workspace"
              value={form.workspaceName}
              onChange={(event) =>
                setForm({ ...form, workspaceName: event.target.value })
              }
              required
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
  );
}
