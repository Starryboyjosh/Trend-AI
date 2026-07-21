"use client";

import { useState, useRef, type KeyboardEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export function Composer({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

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
    setValue("");
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
        onChange={(e) => setValue(e.target.value)}
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
