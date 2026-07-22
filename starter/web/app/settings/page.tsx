"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StepBrand } from "@/components/onboarding/step-brand";
import { AppShell } from "@/components/shell/app-shell";
import type { Tone } from "@/types/brand";

interface Business {
  id: string;
  name: string;
  description: string | null;
  primary_product: string;
  target_audience: string;
}

interface BrandForm {
  voice_tones: Tone[];
  value_proposition: string;
  preferred_words: string;
  forbidden_words: string;
  primary_color: string;
  secondary_color: string;
}

const EMPTY_BRAND: BrandForm = {
  voice_tones: ["friendly"],
  value_proposition: "",
  preferred_words: "",
  forbidden_words: "",
  primary_color: "#541787",
  secondary_color: "#B79CFA",
};

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryProduct, setPrimaryProduct] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brand, setBrand] = useState<BrandForm>(EMPTY_BRAND);
  const [loading, setLoading] = useState(true);
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
          setPrimaryProduct(current.primary_product);
          setTargetAudience(current.target_audience);
          try {
            const profile = (await api.businesses.brandProfile.get(
              current.id
            )) as unknown as {
              voice_tones: Tone[];
              value_proposition: string;
              preferred_words: string[];
              forbidden_words: string[];
              primary_color: string | null;
              secondary_color: string | null;
            };
            setBrand({
              voice_tones: profile.voice_tones,
              value_proposition: profile.value_proposition,
              preferred_words: profile.preferred_words.join(", "),
              forbidden_words: profile.forbidden_words.join(", "),
              primary_color: profile.primary_color || EMPTY_BRAND.primary_color,
              secondary_color:
                profile.secondary_color || EMPTY_BRAND.secondary_color,
            });
          } catch (profileError) {
            if (
              !(profileError instanceof ApiError) ||
              profileError.status !== 404
            ) {
              throw profileError;
            }
          }
        }
      } catch (error) {
        setMessage(
          error instanceof ApiError
            ? error.message
            : "No pudimos cargar la configuración."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    if (!business) return;
    if (!brand.voice_tones.length || !brand.value_proposition.trim()) {
      setMessage("Agrega al menos un tono y una propuesta de valor.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.businesses.update(business.id, {
        name,
        description: description || null,
        primary_product: primaryProduct,
        target_audience: targetAudience,
      });
      await api.businesses.brandProfile.upsert(business.id, {
        voice_tones: brand.voice_tones,
        value_proposition: brand.value_proposition,
        preferred_words: brand.preferred_words
          .split(",")
          .map((word) => word.trim())
          .filter(Boolean),
        forbidden_words: brand.forbidden_words
          .split(",")
          .map((word) => word.trim())
          .filter(Boolean),
        primary_color: brand.primary_color || null,
        secondary_color: brand.secondary_color || null,
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
    <AppShell>
    <main className="app-page app-page--narrow" style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>
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
      {loading ? (
        <p aria-live="polite">Cargando negocio…</p>
      ) : !business ? (
        <p role="alert">No encontramos un negocio configurado.</p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
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
            <label htmlFor="settings-name">
              Nombre
              <input
                id="settings-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={{ display: "block", width: "100%" }}
                maxLength={120}
              />
            </label>
            <label htmlFor="settings-description">
              Descripción
              <textarea
                id="settings-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={1000}
                style={{ display: "block", width: "100%" }}
              />
            </label>
            <label htmlFor="settings-product">
              Producto o servicio principal
              <input
                id="settings-product"
                value={primaryProduct}
                onChange={(event) => setPrimaryProduct(event.target.value)}
                maxLength={240}
                style={{ display: "block", width: "100%" }}
              />
            </label>
            <label htmlFor="settings-audience">
              Audiencia objetivo
              <textarea
                id="settings-audience"
                value={targetAudience}
                onChange={(event) => setTargetAudience(event.target.value)}
                rows={3}
                maxLength={500}
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </section>
          <section
            style={{
              padding: 20,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <StepBrand
              data={brand}
              onChange={(field, value) =>
                setBrand((current) => ({ ...current, [field]: value }))
              }
            />
          </section>
          <button type="button" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      )}
    </main>
    </AppShell>
  );
}
