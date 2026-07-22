"use client";

import Link from "next/link";
import Image from "next/image";
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
    <main className="auth-page">
      <div className="auth-frame">
        <section className="auth-panel" aria-label="HiTrendy para tu negocio">
          <Image
            src="/figma/login/source-1.png"
            alt="Computadora mostrando contenido creado para redes sociales"
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
            className="auth-visual"
            priority
          />
          <span className="auth-metric auth-metric--one">Engagement</span>
          <span className="auth-metric auth-metric--two">2.4k likes</span>
          <span className="auth-metric auth-metric--three">10k followers</span>
        </section>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-brand">
            <Image
              src="/brand/hitrendy-mark.svg"
              alt=""
              width={34}
              height={38}
              priority
            />
            <Image
              src="/figma/login/source-3.png"
              alt="HiTrendy"
              width={122}
              height={30}
              priority
            />
          </div>
          <p className="auth-register-prompt">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
          <h1 id="auth-title">
            {mode === "login"
              ? "¡Bienvenido de vuelta!"
              : "Crea tu espacio de trabajo"}
          </h1>
          <p className="auth-description">
            {mode === "login"
              ? "Ingresa tus datos para seguir creando"
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
              Correo electrónico o usuario
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
            {mode === "login" ? (
              <div className="auth-form-options">
                <label>
                  <input type="checkbox" /> Recordarme
                </label>
                <span>Recuperación de contraseña no disponible en demo</span>
              </div>
            ) : null}
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
        </section>
      </div>
    </main>
  );
}
