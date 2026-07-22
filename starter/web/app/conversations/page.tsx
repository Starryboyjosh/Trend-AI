"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface ConversationItem {
  id: string;
  title: string;
  status: string;
  updated_at: string | null;
  last_message: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "Sin actividad";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

export default function ConversationsPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setItems(
          (await api.conversations.list({
            status,
          })) as unknown as ConversationItem[]
        );
      } catch (cause) {
        setError(
          cause instanceof ApiError
            ? cause.message
            : "No pudimos cargar tus conversaciones."
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [status]);

  async function createConversation() {
    setCreating(true);
    setError("");
    try {
      const businesses = await api.businesses.list();
      if (businesses.length === 0) {
        window.location.assign("/onboarding");
        return;
      }
      const conversation = await api.conversations.create({
        business_id: businesses[0].id as string,
        title: "Nueva conversación",
      });
      window.location.assign(
        `/assistant?conversation=${encodeURIComponent(conversation.id as string)}`
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No pudimos crear la conversación."
      );
    } finally {
      setCreating(false);
    }
  }

  async function changeStatus(item: ConversationItem) {
    setUpdatingId(item.id);
    setError("");
    try {
      await api.conversations.update(item.id, {
        status: item.status === "active" ? "archived" : "active",
      });
      setItems((current) =>
        current.filter((conversation) => conversation.id !== item.id)
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No pudimos actualizar la conversación."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return items;
    return items.filter((item) =>
      `${item.title} ${item.last_message ?? ""}`
        .toLocaleLowerCase("es")
        .includes(normalized)
    );
  }, [items, query]);

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      <Link
        href="/"
        style={{ color: "var(--primary)", textDecoration: "none" }}
      >
        ← Inicio
      </Link>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "end",
          margin: "24px 0",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>
            Conversaciones
          </h1>
          <p style={{ color: "var(--muted-foreground)", marginBottom: 0 }}>
            Retoma tus borradores y decisiones anteriores.
          </p>
        </div>
        <button
          type="button"
          onClick={createConversation}
          disabled={creating}
          style={{
            background: "var(--gradient-primary)",
            color: "var(--primary-foreground)",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: "none",
            fontWeight: 600,
            whiteSpace: "nowrap",
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.65 : 1,
          }}
        >
          {creating ? "Creando…" : "Iniciar conversación"}
        </button>
      </header>
      <div
        role="tablist"
        aria-label="Estado de conversaciones"
        style={{ display: "flex", gap: 8, marginBottom: 20 }}
      >
        {(["active", "archived"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => setStatus(value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background:
                status === value ? "var(--surface-elevated)" : "var(--surface)",
              color: "var(--foreground)",
              cursor: "pointer",
            }}
          >
            {value === "active" ? "Activas" : "Archivadas"}
          </button>
        ))}
      </div>
      <label
        htmlFor="conversation-search"
        style={{ display: "block", fontWeight: 600, marginBottom: 6 }}
      >
        Buscar conversaciones
      </label>
      <input
        id="conversation-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Busca por título o mensaje"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface)",
          color: "var(--foreground)",
        }}
      />
      {error ? (
        <p role="alert" style={{ color: "var(--ht-danger)" }}>
          {error}
        </p>
      ) : null}
      {loading ? (
        <p style={{ color: "var(--muted-foreground)" }}>
          Cargando conversaciones…
        </p>
      ) : null}
      {!loading && !error && filtered.length === 0 ? (
        <section
          style={{
            textAlign: "center",
            padding: 48,
            color: "var(--muted-foreground)",
          }}
        >
          <p>
            {items.length
              ? "No encontramos conversaciones con esa búsqueda."
              : "Aún no tienes conversaciones."}
          </p>
          {!items.length ? (
            <button
              type="button"
              onClick={createConversation}
              disabled={creating}
            >
              Iniciar conversación
            </button>
          ) : null}
        </section>
      ) : null}
      <section
        aria-label="Lista de conversaciones"
        style={{ display: "grid", gap: 12, marginTop: 20 }}
      >
        {filtered.map((item) => (
          <article
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              padding: 18,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
              color: "var(--foreground)",
            }}
          >
            <Link
              href={`/assistant?conversation=${encodeURIComponent(item.id)}`}
              style={{
                color: "inherit",
                textDecoration: "none",
                minWidth: 0,
                flex: 1,
              }}
            >
              <strong>{item.title}</strong>
              <p
                style={{
                  color: "var(--muted-foreground)",
                  margin: "8px 0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.last_message || "Sin mensajes todavía."}
              </p>
              <small style={{ color: "var(--muted-foreground)" }}>
                Actualizada {formatDate(item.updated_at)}
              </small>
            </Link>
            <button
              type="button"
              onClick={() => changeStatus(item)}
              disabled={updatingId === item.id}
              aria-label={`${item.status === "active" ? "Archivar" : "Restaurar"} ${item.title}`}
              style={{
                alignSelf: "center",
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface)",
                color: "var(--foreground)",
                cursor: updatingId === item.id ? "not-allowed" : "pointer",
              }}
            >
              {updatingId === item.id
                ? "Guardando…"
                : item.status === "active"
                  ? "Archivar"
                  : "Restaurar"}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
