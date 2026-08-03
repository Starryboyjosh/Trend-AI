"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { ChatIcon } from "@/components/assistant/chat-icon";

const DRAFT_STORAGE_PREFIX = "hitrendy:composer-draft:";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
  /** Identifies the conversation whose local draft is being edited. */
  draftKey?: string;
  /** Attach control on the left of the field. Hidden when no handler is given. */
  onAttach?: () => void;
  attachLabel?: string;
  attachBusy?: boolean;
}

export function Composer({
  onSend,
  disabled,
  placeholder,
  draftKey,
  onAttach,
  attachLabel = "Adjuntar una imagen",
  attachBusy = false,
}: Props) {
  const [value, setValue] = useState("");
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(
    null
  );
  const activeDraftKeyRef = useRef(draftKey);
  const hasText = Boolean(value.trim());

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
    <div className="conversation-composer">
      {onAttach ? (
        <button
          type="button"
          onClick={onAttach}
          disabled={disabled || attachBusy}
          aria-label={attachLabel}
          className="composer-attach"
        >
          <ChatIcon name={attachBusy ? "spinner" : "plus"} />
        </button>
      ) : null}
      <textarea
        ref={textRef}
        value={value}
        onChange={(e) => updateDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder || "Escribe tu mensaje…"}
        disabled={disabled}
        rows={1}
        aria-label="Mensaje"
        className="composer-input"
      />
      {/* The right slot mirrors the reference: dictation while the field is
          empty, sending once there is something to send. Enter submits either
          way, so no control is ever a dead end. */}
      {voiceAvailable && !hasText ? (
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
          aria-pressed={listening}
          className="composer-mic"
          data-listening={listening || undefined}
        >
          <ChatIcon name="microphone" />
        </button>
      ) : null}
      {hasText || !voiceAvailable ? (
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !hasText}
          aria-label="Enviar"
          className="composer-send"
        >
          <ChatIcon name="send" />
        </button>
      ) : null}
    </div>
  );
}
