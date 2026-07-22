"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Business {
  id: string;
  name: string;
  description: string | null;
  primary_product: string;
  target_audience: string;
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const items = await api.businesses.list();
        const current = items[0] as unknown as Business | undefined;
        if (current) {
          setBusiness(current);
          setName(current.name);
          setDescription(current.description || "");
        }
      } catch (error) {
        setMessage(
          error instanceof ApiError
            ? error.message
            : "No pudimos cargar la configuración."
        );
      }
    })();
  }, []);

  async function save() {
    if (!business) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.businesses.update(business.id, {
        name,
        description: description || null,
      });
      setBusiness(updated as unknown as Business);
      setMessage("Cambios guardados.");
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "No pudimos guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>
      <Link
        href="/"
        style={{ color: "var(--primary)", textDecoration: "none" }}
      >
        ← Inicio
      </Link>
      <h1 style={{ fontFamily: "var(--font-heading)" }}>Configuración</h1>
      <p style={{ color: "var(--muted-foreground)" }}>
        Actualiza el contexto que HiTrendy usa para ayudarte.
      </p>
      {message ? <p role="status">{message}</p> : null}
      {!business ? (
        <p>Cargando negocio…</p>
      ) : (
        <section
          style={{
            display: "grid",
            gap: 16,
            padding: 20,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Negocio</h2>
          <label>
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Descripción
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <p style={{ color: "var(--muted-foreground)" }}>
            Producto: {business.primary_product}
            <br />
            Audiencia: {business.target_audience}
          </p>
          <button type="button" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </section>
      )}
    </main>
  );
}
