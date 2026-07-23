const DEMO_ACCESS_KEY = "hitrendy-demo-access";

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
}
