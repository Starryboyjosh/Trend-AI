"use client";

import { useEffect, useRef } from "react";
import { GeneratedArtifactCard } from "@/components/generated-artifact-card";
import type { GeneratedSocialPost } from "@/types/artifact";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifact?: GeneratedSocialPost;
  artifactId?: string;
}

interface Props {
  messages: Message[];
  loading: boolean;
  onSave?: (artifactId: string | undefined) => void;
  onVariation?: (artifactId: string | undefined, kind: string) => void;
  onFeedback?: (
    artifactId: string | undefined,
    rating: "useful" | "not_useful"
  ) => void;
}

export function MessageList({
  messages,
  loading,
  onSave,
  onVariation,
  onFeedback,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0 && !loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted-foreground)",
          padding: 32,
          textAlign: "center",
        }}
      >
        <h2 style={{ fontFamily: "var(--font-heading)", margin: "0 0 8px" }}>
          ¿Qué quieres crear hoy?
        </h2>
        <p>
          Escribe una publicación, un guion o pide feedback sobre un diseño.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            padding: "4px 16px",
          }}
        >
          <div
            style={{
              maxWidth: "75%",
              padding: msg.role === "user" ? "10px 16px" : 0,
              borderRadius: "var(--radius-lg)",
              background:
                msg.role === "user" ? "var(--primary)" : "transparent",
              color:
                msg.role === "user"
                  ? "var(--primary-foreground)"
                  : "var(--foreground)",
            }}
          >
            {msg.artifact ? (
              <GeneratedArtifactCard
                artifact={msg.artifact}
                onSave={() => onSave?.(msg.artifactId)}
                onVariation={(kind) => onVariation?.(msg.artifactId, kind)}
                onFeedback={(rating) => onFeedback?.(msg.artifactId, rating)}
              />
            ) : (
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div style={{ padding: "8px 16px", color: "var(--muted-foreground)" }}>
          Preparando una propuesta para tu negocio…
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
