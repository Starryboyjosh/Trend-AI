"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { Composer } from "@/components/assistant/composer";
import { Logo } from "@/components/brand/logo";
import { MessageList } from "@/components/assistant/message-list";
import { api, ApiError } from "@/lib/api";
import {
  peekFirstPrompt,
  saveFirstPrompt,
  takeFirstPrompt,
  takeSelectedTemplate,
} from "@/lib/creation-draft";
import { routes } from "@/lib/routes";
import type { GeneratedArtifact, GeneratedSocialPost } from "@/types/artifact";
import type { VisualAnalysis } from "@/components/visual-review-card";

type ConversationStatus = "active" | "archived";

interface ConversationItem {
  id: string;
  title: string;
  status: ConversationStatus;
  last_message?: string | null;
  updated_at?: string | null;
}
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifact?: GeneratedArtifact;
  analysis?: VisualAnalysis;
  artifactId?: string;
}
interface ConversationData {
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

export function StudioWorkspace({
  conversationId,
}: {
  conversationId?: string;
}) {
  const router = useRouter();
  const visualFileRef = useRef<HTMLInputElement>(null);
  const firstPromptSentRef = useRef(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConversationStatus>("active");
  const [query, setQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadReady, setThreadReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [uploadingVisual, setUploadingVisual] = useState(false);
  const [error, setError] = useState("");
  const [firstPrompt, setFirstPrompt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingList(true);
    void api.conversations
      .list({ status, ...(query.trim() ? { search: query.trim() } : {}) })
      .then((items) => {
        if (active) setConversations(items as unknown as ConversationItem[]);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof ApiError
              ? reason.message
              : "No pudimos cargar las conversaciones."
          );
      })
      .finally(() => {
        if (active) setLoadingList(false);
      });
    return () => {
      active = false;
    };
  }, [query, status]);

  useEffect(() => {
    let active = true;
    if (!conversationId) {
      setMessages([]);
      setThreadReady(false);
      return () => {
        active = false;
      };
    }
    setLoadingThread(true);
    setThreadReady(false);
    setError("");
    void api.conversations
      .get(conversationId)
      .then((data) => {
        if (!active) return;
        const thread = data as ConversationData;
        setMessages(
          (thread.messages || []).map((message) => ({
            id: message.id,
            role: message.role as "user" | "assistant",
            content: message.content,
            analysis: message.metadata?.analysis,
            artifact: message.artifact,
            artifactId: message.artifact_id || undefined,
          }))
        );
      })
      .catch((reason) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 404) {
          router.replace(routes.studioNew);
          return;
        }
        setError(
          reason instanceof ApiError
            ? reason.message
            : "No pudimos abrir esta conversación."
        );
      })
      .finally(() => {
        if (active) {
          setLoadingThread(false);
          setThreadReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [conversationId, router]);

  useEffect(() => {
    if (!conversationId) {
      firstPromptSentRef.current = false;
      setFirstPrompt(peekFirstPrompt());
    }
  }, [conversationId]);

  async function createConversation() {
    setCreating(true);
    setError("");
    try {
      const businesses = await api.businesses.list();
      if (!businesses.length) {
        router.push("/onboarding");
        return;
      }
      const templateId = takeSelectedTemplate();
      if (templateId && !peekFirstPrompt()) {
        saveFirstPrompt(
          "Quiero personalizar la plantilla que acabo de elegir."
        );
      }
      const conversation = await api.conversations.create({
        business_id: businesses[0].id,
        title: "Nueva conversación",
      });
      router.push(`/studio/${encodeURIComponent(conversation.id as string)}`);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos crear la conversación."
      );
    } finally {
      setCreating(false);
    }
  }

  async function updateConversation(item: ConversationItem) {
    setUpdatingId(item.id);
    setError("");
    try {
      await api.conversations.update(item.id, {
        status: item.status === "active" ? "archived" : "active",
      });
      setConversations((items) =>
        items.filter((conversation) => conversation.id !== item.id)
      );
      if (item.id === conversationId) router.push(routes.studioNew);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos actualizar la conversación."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function send(
    text: string,
    intent:
      | "create_social_post"
      | "create_short_video_script"
      | "analyze_visual" = "create_social_post",
    attachmentIds: string[] = []
  ) {
    if (!conversationId || loading) return;
    const tempId = `temp_${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: tempId, role: "user", content: text },
    ]);
    setLoading(true);
    setError("");
    try {
      const result = (await api.conversations.sendMessage(
        conversationId,
        text,
        intent,
        attachmentIds
      )) as unknown as SendResult;
      if (result.type === "artifact")
        setMessages((current) => [
          ...current,
          {
            id: result.assistant_message?.id || `msg_${Date.now()}`,
            role: "assistant",
            content: result.assistant_message?.content || "",
            artifact: result.artifact,
            artifactId: result.artifact_id,
          },
        ]);
      else if (result.type === "visual_analysis" && result.analysis) {
        const analysis = result.analysis;
        setMessages((current) => [
          ...current,
          {
            id: result.assistant_message?.id || `analysis_${Date.now()}`,
            role: "assistant",
            content: result.assistant_message?.content || analysis.summary,
            analysis,
          },
        ]);
      } else if (result.type === "error")
        setError(result.message || "No pudimos generar contenido.");
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Error de conexión. Tu mensaje sigue disponible en el borrador."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!conversationId || !threadReady || firstPromptSentRef.current) return;
    const prompt = takeFirstPrompt();
    if (prompt) {
      firstPromptSentRef.current = true;
      void send(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, threadReady]);

  async function uploadVisual(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !conversationId) return;
    setUploadingVisual(true);
    try {
      const uploaded = await api.assets.upload(file);
      const assetId = uploaded.asset_id as string | undefined;
      if (!assetId) throw new Error("La imagen no se pudo preparar.");
      await send("Analiza esta imagen para mi negocio.", "analyze_visual", [
        assetId,
      ]);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos subir la imagen."
      );
    } finally {
      setUploadingVisual(false);
      event.target.value = "";
    }
  }

  async function saveArtifact(artifactId: string | undefined) {
    if (!artifactId) return;
    try {
      await api.projects.create({ artifact_id: artifactId });
      void api.artifacts.event(artifactId, "saved");
      setError("Proyecto guardado.");
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos guardar el proyecto."
      );
    }
  }

  async function createVariation(artifactId: string | undefined, kind: string) {
    if (!artifactId || !conversationId || loading) return;
    setLoading(true);
    try {
      const result = (await api.artifacts.createVariation(
        conversationId,
        artifactId,
        kind
      )) as unknown as SendResult;
      if (result.type === "artifact" && result.artifact)
        setMessages((current) => [
          ...current,
          {
            id: `var_${Date.now()}`,
            role: "assistant",
            content: (result.artifact as GeneratedSocialPost).caption || "",
            artifact: result.artifact,
            artifactId,
          },
        ]);
      else setError(result.message || "No pudimos crear la variación.");
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos crear la variación."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="studio-layout" aria-label="Studio de contenido">
      <aside className="studio-sidebar">
        <button
          type="button"
          className="button-primary"
          onClick={createConversation}
          disabled={creating}
        >
          {creating ? "Creando…" : "Nueva creación"}
        </button>
        <label className="search-field" htmlFor="conversation-search">
          Buscar conversaciones
          <input
            id="conversation-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título o mensaje"
          />
        </label>
        <div
          className="studio-sidebar-tabs"
          role="tablist"
          aria-label="Estado de conversaciones"
        >
          <button
            type="button"
            role="tab"
            aria-selected={status === "active"}
            onClick={() => setStatus("active")}
          >
            Recientes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={status === "archived"}
            onClick={() => setStatus("archived")}
          >
            Archivadas
          </button>
        </div>
        <div className="conversation-list" aria-live="polite">
          {loadingList ? (
            <p className="muted-text">Cargando…</p>
          ) : conversations.length ? (
            conversations.map((item) => (
              <div
                key={item.id}
                className="conversation-list-item"
                data-active={item.id === conversationId || undefined}
              >
                <Link href={`/studio/${encodeURIComponent(item.id)}`}>
                  <strong>{item.title}</strong>
                  <span>{item.last_message || "Sin mensajes"}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => updateConversation(item)}
                  disabled={updatingId === item.id}
                  aria-label={`${item.status === "active" ? "Archivar" : "Restaurar"} ${item.title}`}
                >
                  {updatingId === item.id
                    ? "…"
                    : item.status === "active"
                      ? "Archivar"
                      : "Restaurar"}
                </button>
              </div>
            ))
          ) : (
            <p className="muted-text">
              {query
                ? "No hay coincidencias."
                : status === "active"
                  ? "Aún no tienes conversaciones."
                  : "No hay conversaciones archivadas."}
            </p>
          )}
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-header">
          <Logo inverse />
          <div className="studio-status"><span /> Asistente disponible</div>
          <div className="studio-header-copy visually-hidden">
            <p className="eyebrow">STUDIO</p>
            <h1>Tu espacio de creación</h1>
          </div>
          {conversationId ? (
            <div className="assistant-header-actions">
              <button
                type="button"
                onClick={() =>
                  send(
                    "Crea un guion breve para video vertical sobre mi producto principal.",
                    "create_short_video_script"
                  )
                }
                disabled={loading}
                className="button-secondary button-small"
              >
                Crear guion
              </button>
              <input
                ref={visualFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadVisual}
                disabled={loading || uploadingVisual}
                className="visually-hidden"
                aria-label="Subir imagen para analizar"
              />
              <button
                type="button"
                onClick={() => visualFileRef.current?.click()}
                disabled={loading || uploadingVisual}
                className="button-secondary button-small"
              >
                {uploadingVisual ? "Subiendo…" : "Analizar imagen"}
              </button>
            </div>
          ) : null}
        </header>
        {conversationId ? (
          <>
            {error ? (
              <p className="studio-error" role="alert">
                {error}
              </p>
            ) : null}
            {loadingThread ? (
              <div className="route-status">Abriendo conversación…</div>
            ) : (
              <>
                <MessageList
                  messages={messages}
                  loading={loading}
                  onSave={saveArtifact}
                  onVariation={createVariation}
                  onFeedback={(artifactId, rating) =>
                    artifactId
                      ? api.artifacts
                          .feedback(artifactId, rating)
                          .catch(() =>
                            setError("No pudimos guardar tu feedback.")
                          )
                      : undefined
                  }
                  onCopy={(artifactId) =>
                    artifactId
                      ? void api.artifacts.event(artifactId, "copied")
                      : undefined
                  }
                />
                <Composer
                  onSend={send}
                  disabled={loading}
                  draftKey={conversationId}
                />
              </>
            )}
          </>
        ) : (
          <section className="studio-empty-state">
            <Logo inverse className="studio-welcome-logo" />
            <h1>{firstPrompt ? "Tu idea está lista para convertirse en contenido." : "¿Qué haremos hoy?"}</h1>
            <p>{firstPrompt ? `“${firstPrompt}”` : "Cuéntame qué necesitas y construiremos la idea paso a paso."}</p>
            <div className="studio-quick-grid">
              <button type="button" onClick={createConversation} disabled={creating}><strong>Crear una publicación</strong><span>Texto, enfoque visual y llamada a la acción.</span></button>
              <button type="button" onClick={createConversation} disabled={creating}><strong>Revisar un diseño</strong><span>Fortalezas, problemas y recomendaciones claras.</span></button>
              <button type="button" onClick={createConversation} disabled={creating}><strong>Planear contenido</strong><span>Ideas adaptadas a tu negocio y audiencia.</span></button>
            </div>
            <button type="button" className="studio-empty-composer" onClick={createConversation} disabled={creating}><span>＋</span><em>Escribe tu idea o pregunta...</em><b>→</b></button>
            {error ? (
              <p className="studio-error" role="alert">
                {error}
              </p>
            ) : null}
          </section>
        )}
      </div>
    </section>
  );
}
