"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

import { ProgressBar } from "@/components/onboarding/progress-bar";
import { StepBusiness } from "@/components/onboarding/step-business";
import { StepAudience } from "@/components/onboarding/step-audience";
import { StepChannels } from "@/components/onboarding/step-channels";
import { StepBrand } from "@/components/onboarding/step-brand";
import { StepReview } from "@/components/onboarding/step-review";
import { api, ApiError } from "@/lib/api";
import type { Category, Objective, Platform } from "@/types/business";
import type { Tone } from "@/types/brand";

const STEPS = [
  "Datos del negocio",
  "Audiencia y ubicación",
  "Canales y objetivos",
  "Identidad de marca",
  "Revisar y guardar",
];

const STORAGE_KEY = "hitrendy_onboarding_draft";

interface OnboardingData {
  name: string;
  category: Category | "";
  description: string;
  country: string;
  city: string;
  primary_product: string;
  target_audience: string;
  preferred_platforms: Platform[];
  primary_objective: Objective | "";
  voice_tones: Tone[];
  value_proposition: string;
  preferred_words: string;
  forbidden_words: string;
  primary_color: string;
  secondary_color: string;
}

const INITIAL: OnboardingData = {
  name: "",
  category: "",
  description: "",
  country: "",
  city: "",
  primary_product: "",
  target_audience: "",
  preferred_platforms: [],
  primary_objective: "",
  voice_tones: [],
  value_proposition: "",
  preferred_words: "",
  forbidden_words: "",
  primary_color: "#541787",
  secondary_color: "#B79CFA",
};

function loadDraft(): { step: number; data: OnboardingData } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.step === "number" && parsed.data) {
      return { step: parsed.step, data: { ...INITIAL, ...parsed.data } };
    }
  } catch {
    // corrupted storage, ignore
  }
  return null;
}

function saveDraft(step: number, data: OnboardingData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
  } catch {
    // storage full or unavailable
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setStep(draft.step);
      setData(draft.data);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDraft(step, data);
  }, [step, data, hydrated]);

  const update = useCallback((field: string, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return !!data.name && !!data.category;
      case 1:
        return (
          !!data.country &&
          !!data.city &&
          !!data.primary_product &&
          !!data.target_audience
        );
      case 2:
        return data.preferred_platforms.length > 0 && !!data.primary_objective;
      case 3:
        return data.voice_tones.length > 0 && !!data.value_proposition;
      default:
        return true;
    }
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      canProceed() &&
      step < STEPS.length - 1
    ) {
      e.preventDefault();
      next();
    }
    if (e.key === "Escape" && step > 0) {
      e.preventDefault();
      back();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const business = await api.businesses.create({
        name: data.name,
        category: data.category,
        country: data.country,
        city: data.city,
        description: data.description || undefined,
        primary_product: data.primary_product,
        target_audience: data.target_audience,
        preferred_platforms: data.preferred_platforms,
        primary_objective: data.primary_objective,
      });

      const preferred = data.preferred_words
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
      const forbidden = data.forbidden_words
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);

      await api.businesses.brandProfile.upsert(business.id as string, {
        voice_tones: data.voice_tones,
        value_proposition: data.value_proposition,
        preferred_words: preferred,
        forbidden_words: forbidden,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
      });

      clearDraft();
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Ocurrió un error al guardar. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) return null;

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "48px 24px",
        minHeight: "100vh",
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-sm)",
            background: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            color: "var(--primary-foreground)",
          }}
        >
          H
        </div>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: "1.2rem",
          }}
        >
          Configura tu negocio
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.75rem",
            color: "var(--muted-foreground)",
          }}
        >
          {hydrated && "Guardado automáticamente"}
        </span>
      </div>

      <ProgressBar steps={STEPS} current={step} />

      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: "var(--radius-md)",
            marginBottom: 16,
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {step === 0 && <StepBusiness data={data} onChange={update} />}
        {step === 1 && <StepAudience data={data} onChange={update} />}
        {step === 2 && <StepChannels data={data} onChange={update} />}
        {step === 3 && <StepBrand data={data} onChange={update} />}
        {step === 4 && (
          <StepReview
            business={data as unknown as Record<string, unknown>}
            brand={data as unknown as Record<string, unknown>}
            submitting={submitting}
          />
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 32,
          }}
        >
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            style={{
              padding: "10px 20px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              cursor: step === 0 ? "not-allowed" : "pointer",
              opacity: step === 0 ? 0.5 : 1,
            }}
          >
            Anterior
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canProceed()}
              style={{
                padding: "10px 24px",
                border: 0,
                borderRadius: "var(--radius-sm)",
                background: canProceed()
                  ? "var(--gradient-primary)"
                  : "var(--border)",
                color: canProceed()
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
                cursor: canProceed() ? "pointer" : "not-allowed",
                fontWeight: 600,
              }}
            >
              Siguiente <kbd style={{ marginLeft: 8, opacity: 0.7 }}>Enter</kbd>
            </button>
          ) : null}
        </div>

        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--muted-foreground)",
            marginTop: 16,
          }}
        >
          Usa <kbd>Enter</kbd> para avanzar · <kbd>Esc</kbd> para retroceder
        </p>
      </form>
    </div>
  );
}
