"use client";

import Link from "next/link";
import { Suspense, useState, useCallback, useEffect, useRef, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Composer } from "@/components/assistant/composer";
import { MessageList } from "@/components/assistant/message-list";
import { api, ApiError } from "@/lib/api";
import type { GeneratedArtifact, GeneratedSocialPost } from "@/types/artifact";
import type { VisualAnalysis } from "@/components/visual-review-card";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifact?: GeneratedArtifact;
  analysis?: VisualAnalysis;
  artifactId?: string;
}

interface ConvData {
  id: string;
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    metadata?: { analysis?: VisualAnalysis } | null;
    artifact?: GeneratedArtifact;
    artifact_id?: string | null;
  }>;
}

interface SendResult {
  type: string;
  message?: string;
  assistant_message?: { id: string; content: string };
  artifact?: GeneratedArtifact;
  artifact_id?: string;
  analysis?: VisualAnalysis;
}

function AssistantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [uploadingVisual, setUploadingVisual] = useState(false);
  const visualFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function initConversation() {
    setInitializing(true);
    setError("");
    try {
      const convs = await api.conversations.list();

      if (convs.length === 0) {
        const businesses = await api.businesses.list();
        if (businesses.length === 0) {
          router.push("/onboarding");
          return;
        }
        setError("Crea una conversación para empezar a generar contenido.");
        return;
      }
      const requestedId = searchParams.get("conversation");
      const convId = (
        convs.some((conversation) => conversation.id === requestedId)
          ? requestedId
          : convs[0].id
      ) as string;
      setConversationId(convId);

      const full = (await api.conversations.get(convId)) as unknown as ConvData;
      const msgs = (full.messages || []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        analysis: m.metadata?.analysis,
        artifact: m.artifact,
        artifactId: m.artifact_id || undefined,
      }));
      setMessages(msgs);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404 || err.code === "NOT_FOUND") {
          router.push("/onboarding");
          return;
        }
        setError(err.message);
      } else {
        setError("Error al iniciar la conversación.");
      }
    } finally {
      setInitializing(false);
    }
  }

  const handleSend = useCallback(
    async (
      text: string,
      uiIntent:
        | "create_social_post"
        | "create_short_video_script"
        | "analyze_visual" = "create_social_post",
      attachmentIds: string[] = []
    ) => {
      if (!conversationId || loading) return;

      const tempId = `temp_${Date.now()}`;
      const userMsg: ChatMessage = { id: tempId, role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError("");

      try {
        const result = (await api.conversations.sendMessage(
          conversationId,
          text,
          uiIntent,
          attachmentIds
        )) as unknown as SendResult;

        if (result.type === "artifact") {
          const assistantMsg: ChatMessage = {
            id: result.assistant_message?.id || `msg_${Date.now()}`,
            role: "assistant",
            content: result.assistant_message?.content || "",
            artifact: result.artifact,
            artifactId: result.artifact_id,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else if (result.type === "visual_analysis" && result.analysis) {
          const analysis = result.analysis;
          setMessages((prev) => [
            ...prev,
            {
              id: result.assistant_message?.id || `analysis_${Date.now()}`,
              role: "assistant",
              content: result.assistant_message?.content || analysis.summary,
              analysis,
            },
          ]);
        } else if (result.type === "error") {
          setError(result.message || "Error al generar contenido.");
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Error de conexión. Tu mensaje está guardado.");
        }
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading]
  );

  const handleVisualUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || loading || !conversationId) return;
      setUploadingVisual(true);
      setError("");
      try {
        const uploaded = await api.assets.upload(file);
        const assetId = uploaded.asset_id as string | undefined;
        if (!assetId) throw new Error("La imagen no se pudo preparar.");
        await handleSend("Analiza esta imagen para mi negocio.", "analyze_visual", [assetId]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "No pudimos subir la imagen.");
      } finally {
        setUploadingVisual(false);
        event.target.value = "";
      }
    },
    [conversationId, handleSend, loading]
  );

  const handleSave = useCallback(async (artifactId: string | undefined) => {
    if (!artifactId) return;
    setError("");
    try {
      const project = await api.projects.create({ artifact_id: artifactId });
      setError("Proyecto guardado ✓");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al guardar el proyecto.");
      }
    }
  }, []);

  const handleVariation = useCallback(
    async (artifactId: string | undefined, kind: string) => {
      if (!artifactId || !conversationId || loading) return;
      setError("");
      setLoading(true);
      try {
        const result = (await api.artifacts.createVariation(
          conversationId,
          artifactId,
          kind
        )) as unknown as SendResult;

        if (result.type === "artifact" && result.artifact) {
          const assistantMsg: ChatMessage = {
            id: `var_${Date.now()}`,
            role: "assistant",
            content: result.artifact.caption || "",
            artifact: result.artifact as GeneratedSocialPost,
            artifactId: artifactId,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else if (result.type === "error") {
          setError(result.message || "Error al generar variación.");
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Error al generar la variación.");
        }
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading]
  );

  const handleFeedback = useCallback(
    async (artifactId: string | undefined, rating: "useful" | "not_useful") => {
      if (!artifactId) return;
      try {
        await api.artifacts.feedback(artifactId, rating);
        setError(
          rating === "useful"
            ? "Gracias por tu feedback."
            : "Gracias; usaremos tu feedback para mejorar."
        );
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "No pudimos guardar tu feedback."
        );
      }
    },
    []
  );

  if (initializing) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--muted-foreground)",
        }}
      >
        Iniciando…
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: 800,
        margin: "0 auto",
        background: "var(--background)",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: "1.1rem",
          }}
        >
          Asistente de Contenido
        </span>
        <Link
          href="/conversations"
          style={{
            color: "var(--primary)",
            fontSize: "0.85rem",
            marginLeft: "auto",
          }}
        >
          Conversaciones
        </Link>
        <button
          type="button"
          onClick={() =>
            handleSend(
              "Crea un guion breve para video vertical sobre mi producto principal.",
              "create_short_video_script"
            )
          }
          disabled={loading || !conversationId}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
            color: "var(--foreground)",
            padding: "7px 10px",
            cursor: loading || !conversationId ? "not-allowed" : "pointer",
          }}
        >
          Crear guion
        </button>
        <input
          ref={visualFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleVisualUpload}
          disabled={loading || uploadingVisual || !conversationId}
          style={{ display: "none" }}
          aria-label="Subir imagen para analizar"
        />
        <button
          type="button"
          onClick={() => visualFileRef.current?.click()}
          disabled={loading || uploadingVisual || !conversationId}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
            color: "var(--foreground)",
            padding: "7px 10px",
            cursor: loading || uploadingVisual || !conversationId ? "not-allowed" : "pointer",
          }}
        >
          {uploadingVisual ? "Subiendo…" : "Analizar imagen"}
        </button>
        {error && (
          <span style={{ fontSize: "0.8rem", color: "var(--ht-danger)" }}>
            {error}
          </span>
        )}
      </header>

      <MessageList
        messages={messages}
        loading={loading}
        onSave={handleSave}
        onVariation={handleVariation}
        onFeedback={handleFeedback}
      />
      <Composer
        onSend={handleSend}
        disabled={loading || !conversationId}
        draftKey={conversationId || undefined}
      />
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }}>Iniciando…</div>}>
      <AssistantContent />
    </Suspense>
  );
}
