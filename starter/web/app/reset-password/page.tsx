"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { PublicAuthRoute } from "@/components/auth/public-auth-route";
import { api, ApiError } from "@/lib/api";
import { routes } from "@/lib/routes";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      if (!token) {
        await api.auth.passwordReset.request(email.trim());
        setMessage("Si el correo está registrado, recibirás instrucciones para recuperar el acceso.");
      } else {
        if (password !== confirmation) {
          setError("Las contraseñas no coinciden.");
          return;
        }
        await api.auth.passwordReset.confirm(token, password);
        setMessage("Tu contraseña fue actualizada. Ya puedes iniciar sesión.");
      }
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "No pudimos completar la recuperación.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page--single">
      <section className="auth-card" aria-labelledby="reset-title">
        <div className="auth-brand"><Logo /></div>
        <h1 id="reset-title">{token ? "Crea una nueva contraseña" : "Recupera tu acceso"}</h1>
        <p className="auth-description">
          {token
            ? "El enlace es de un solo uso y caduca pronto."
            : "Te enviaremos un enlace si encontramos una cuenta con ese correo."}
        </p>
        <form onSubmit={submit} className="auth-form">
          {!token ? (
            <label htmlFor="reset-email">
              Correo electrónico
              <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </label>
          ) : (
            <>
              <label htmlFor="reset-password">
                Nueva contraseña
                <input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} autoComplete="new-password" />
              </label>
              <label htmlFor="reset-password-confirmation">
                Repite la contraseña
                <input id="reset-password-confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={12} autoComplete="new-password" />
              </label>
            </>
          )}
          {message ? <p role="status" className="auth-success">{message}</p> : null}
          {error ? <p role="alert" className="auth-error">{error}</p> : null}
          <button type="submit" disabled={submitting}>
            {submitting ? "Procesando…" : token ? "Actualizar contraseña" : "Enviar instrucciones"}
          </button>
        </form>
        <p className="auth-register-prompt"><Link href={routes.login}>Volver a iniciar sesión</Link></p>
        <p className="auth-register-prompt"><Link href={routes.privacy}>Privacidad</Link> · <Link href={routes.terms}>Términos</Link></p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <PublicAuthRoute>
      <Suspense fallback={<main className="route-status">Preparando recuperación…</main>}>
        <ResetPasswordForm />
      </Suspense>
    </PublicAuthRoute>
  );
}

