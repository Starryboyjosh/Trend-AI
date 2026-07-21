"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Composer } from "@/components/assistant/composer";
import { MessageList } from "@/components/assistant/message-list";
import { api, ApiError } from "@/lib/api";
import type { GeneratedSocialPost } from "@/types/artifact";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifact?: GeneratedSocialPost;
}

interface ConvData {
  id: string;
  messages?: Array<{ id: string; role: string; content: string }>;
}

interface SendResult {
  type: string;
  message?: string;
  assistant_message?: { id: string; content: string };
  artifact?: GeneratedSocialPost;
}

export default function AssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initConversation() {
    setInitializing(true);
    setError("");
    try {
      const convs = await api.conversations.list();

      if (convs.length === 0) {
        router.push("/onboarding");
        return;
      }
      const convId = convs[0].id as string;
      setConversationId(convId);

      const full = (await api.conversations.get(convId)) as unknown as ConvData;
      const msgs = (full.messages || []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
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
    async (text: string) => {
      if (!conversationId || loading) return;

      const tempId = `temp_${Date.now()}`;
      const userMsg: ChatMessage = { id: tempId, role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError("");

      try {
        const result = (await api.conversations.sendMessage(
          conversationId,
          text
        )) as unknown as SendResult;

        if (result.type === "artifact") {
          const assistantMsg: ChatMessage = {
            id: result.assistant_message?.id || `msg_${Date.now()}`,
            role: "assistant",
            content: result.assistant_message?.content || "",
            artifact: result.artifact,
          };
          setMessages((prev) => [...prev, assistantMsg]);
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
        {error && (
          <span style={{ fontSize: "0.8rem", color: "var(--ht-danger)" }}>
            {error}
          </span>
        )}
      </header>

      <MessageList messages={messages} loading={loading} />
      <Composer onSend={handleSend} disabled={loading || !conversationId} />
    </div>
  );
}
