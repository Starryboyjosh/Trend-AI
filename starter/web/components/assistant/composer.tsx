"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

const DRAFT_STORAGE_PREFIX = "hitrendy:composer-draft:";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
  /** Identifies the conversation whose local draft is being edited. */
  draftKey?: string;
}

export function Composer({ onSend, disabled, placeholder, draftKey }: Props) {
  const [value, setValue] = useState("");
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(
    null
  );
  const activeDraftKeyRef = useRef(draftKey);

  const updateDraft = useCallback(
    (nextValue: string | ((current: string) => string)) => {
      setValue((current) => {
        const resolved =
          typeof nextValue === "function" ? nextValue(current) : nextValue;
        const key = activeDraftKeyRef.current;

        if (key) {
          try {
            if (resolved) {
              window.localStorage.setItem(`${DRAFT_STORAGE_PREFIX}${key}`, resolved);
            } else {
              window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${key}`);
            }
          } catch {
            // The composer remains usable when browser storage is unavailable.
          }
        }

        return resolved;
      });
    },
    []
  );

  useEffect(() => {
    activeDraftKeyRef.current = draftKey;
    if (!draftKey) {
      setValue("");
      return;
    }

    try {
      setValue(window.localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${draftKey}`) || "");
    } catch {
      setValue("");
    }
  }, [draftKey]);

  useEffect(() => {
    const VoiceRecognition = (
      window as typeof window & {
        webkitSpeechRecognition?: new () => {
          lang: string;
          interimResults: boolean;
          start: () => void;
          stop: () => void;
          onresult: (event: {
            results: ArrayLike<ArrayLike<{ transcript: string }>>;
          }) => void;
          onend: () => void;
        };
      }
    ).webkitSpeechRecognition;
    if (!VoiceRecognition) return;
    const recognition = new VoiceRecognition();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.onresult = (event) =>
      updateDraft((current) =>
        `${current} ${event.results[0][0].transcript}`.trim()
      );
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setVoiceAvailable(true);
    return () => recognition.stop();
  }, [updateDraft]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    updateDraft("");
    if (textRef.current) {
      textRef.current.style.height = "auto";
    }
  }

  function handleInput() {
    if (textRef.current) {
      textRef.current.style.height = "auto";
      textRef.current.style.height = `${textRef.current.scrollHeight}px`;
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
        borderTop: "1px solid var(--border)",
        padding: "12px 16px",
        background: "var(--surface)",
      }}
    >
      <textarea
        ref={textRef}
        value={value}
        onChange={(e) => updateDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder || "Escribe tu mensaje..."}
        disabled={disabled}
        rows={1}
        aria-label="Mensaje"
        style={{
          flex: 1,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "10px 14px",
          background: "var(--input)",
          color: "var(--foreground)",
          fontFamily: "var(--font-body)",
          fontSize: "0.95rem",
          resize: "none",
          minHeight: 44,
          maxHeight: 160,
        }}
      />
      {voiceAvailable ? (
        <button
          type="button"
          onClick={() => {
            if (listening) recognitionRef.current?.stop();
            else {
              setListening(true);
              recognitionRef.current?.start();
            }
          }}
          disabled={disabled}
          aria-label={listening ? "Detener dictado" : "Dictar mensaje"}
          style={{
            padding: "10px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
            color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          {listening ? "Detener" : "Dictar"}
        </button>
      ) : null}
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Enviar"
        style={{
          padding: "10px 20px",
          border: 0,
          borderRadius: "var(--radius-md)",
          background: value.trim()
            ? "var(--gradient-primary)"
            : "var(--border)",
          color: value.trim()
            ? "var(--primary-foreground)"
            : "var(--muted-foreground)",
          cursor: value.trim() && !disabled ? "pointer" : "not-allowed",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Enviar
      </button>
    </div>
  );
}
