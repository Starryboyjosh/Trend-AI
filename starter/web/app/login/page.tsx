"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        await api.auth.register({
          email,
          password,
          name,
          workspace_name: workspaceName,
        });
      } else {
        await api.auth.login({ email, password });
      }
      router.replace("/");
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

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--gradient-hero)",
      }}
    >
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">HITRENDY</p>
        <h1 id="auth-title">
          {mode === "login"
            ? "Bienvenido de vuelta"
            : "Crea tu espacio de trabajo"}
        </h1>
        <p className="auth-description">
          {mode === "login"
            ? "Inicia sesión para continuar creando contenido para tu negocio."
            : "Tu espacio de trabajo mantendrá organizados tus perfiles y proyectos."}
        </p>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <>
              <label>
                Tu nombre
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={120}
                  autoComplete="name"
                />
              </label>
              <label>
                Nombre del espacio de trabajo
                <input
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  required
                  maxLength={120}
                />
              </label>
            </>
          )}
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={mode === "register" ? 12 : 1}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </label>
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting}>
            {submitting
              ? "Procesando…"
              : mode === "login"
                ? "Iniciar sesión"
                : "Crear cuenta"}
          </button>
        </form>
        <button
          type="button"
          className="auth-switch"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "¿No tienes cuenta? Crear una"
            : "¿Ya tienes cuenta? Iniciar sesión"}
        </button>
      </section>
    </main>
  );
}
