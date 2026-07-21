"use client";

interface Props {
  steps: string[];
  current: number;
}

export function ProgressBar({ steps, current }: Props) {
  return (
    <nav aria-label="Progreso de registro" style={{ marginBottom: 32 }}>
      <ol
        style={{
          display: "flex",
          gap: 8,
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={label}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: active
                  ? "var(--primary)"
                  : done
                    ? "var(--secondary)"
                    : "var(--border)",
                transition: "background 0.2s",
              }}
              title={label}
            />
          );
        })}
      </ol>
      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--muted-foreground)",
          marginTop: 8,
        }}
      >
        Paso {current + 1} de {steps.length}: {steps[current]}
      </p>
    </nav>
  );
}
