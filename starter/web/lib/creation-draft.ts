const FIRST_PROMPT_KEY = "hitrendy:first-prompt";

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // The creation flow remains available when browser storage is blocked.
  }
}

function remove(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Nothing else is required when browser storage is blocked.
  }
}

export function saveFirstPrompt(prompt: string) {
  write(FIRST_PROMPT_KEY, prompt.trim());
}

export function takeFirstPrompt() {
  const prompt = read(FIRST_PROMPT_KEY);
  remove(FIRST_PROMPT_KEY);
  return prompt;
}

export function peekFirstPrompt() {
  return read(FIRST_PROMPT_KEY);
}
