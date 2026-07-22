"use client";

import { useEffect, useRef } from "react";
import { GeneratedArtifactCard } from "@/components/generated-artifact-card";
import { GeneratedVideoScriptCard } from "@/components/generated-video-script-card";
import { VisualReviewCard, type VisualAnalysis } from "@/components/visual-review-card";
import type { GeneratedArtifact } from "@/types/artifact";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifact?: GeneratedArtifact;
  analysis?: VisualAnalysis;
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
  onCopy?: (artifactId: string | undefined) => void;
}

export function MessageList({
  messages,
  loading,
  onSave,
  onVariation,
  onFeedback,
  onCopy,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });
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
    <div
      role="log"
      aria-label="Conversación"
      aria-live="polite"
      aria-relevant="additions text"
      aria-busy={loading}
      style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}
    >
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
            {msg.analysis ? (
              <VisualReviewCard analysis={msg.analysis} />
            ) : msg.artifact?.artifact_type === "social_post" ? (
              <GeneratedArtifactCard
                artifact={msg.artifact}
                onSave={() => onSave?.(msg.artifactId)}
                onVariation={(kind) => onVariation?.(msg.artifactId, kind)}
                onFeedback={(rating) => onFeedback?.(msg.artifactId, rating)}
                onCopy={() => onCopy?.(msg.artifactId)}
              />
            ) : msg.artifact?.artifact_type === "short_video_script" ? (
              <GeneratedVideoScriptCard
                artifact={msg.artifact}
                onSave={() => onSave?.(msg.artifactId)}
                onFeedback={(rating) => onFeedback?.(msg.artifactId, rating)}
                onCopy={() => onCopy?.(msg.artifactId)}
              />
            ) : (
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div
          role="status"
          style={{ padding: "8px 16px", color: "var(--muted-foreground)" }}
        >
          Preparando una propuesta para tu negocio…
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
