const DEMO_ACCESS_KEY = "hitrendy-demo-access";
const DEMO_PROJECTS_KEY = "hitrendy-demo-projects";

function isBrowser() {
  return typeof window !== "undefined";
}

export function isDemoHost() {
  if (!isBrowser()) return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

export function isDemoModeEnabled() {
  if (!isBrowser() || !isDemoHost()) return false;
  return window.localStorage.getItem(DEMO_ACCESS_KEY) === "1";
}

export function enableDemoMode() {
  if (!isBrowser() || !isDemoHost()) return;
  window.localStorage.setItem(DEMO_ACCESS_KEY, "1");
}

export function disableDemoMode() {
  if (!isBrowser() || !isDemoHost()) return;
  window.localStorage.removeItem(DEMO_ACCESS_KEY);
  window.sessionStorage.removeItem(DEMO_PROJECTS_KEY);
}

export function readDemoProjects<T>(fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.sessionStorage.getItem(DEMO_PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveDemoProjects(value: unknown) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(DEMO_PROJECTS_KEY, JSON.stringify(value));
  } catch {
    // Demo mode still works for the current screen when storage is unavailable.
  }
}
