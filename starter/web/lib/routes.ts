export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  templates: "/templates",
  studioNew: "/studio/new",
  settings: "/settings",
} as const;

const protectedExactPaths = new Set<string>([
  routes.dashboard,
  routes.templates,
  routes.studioNew,
  routes.settings,
]);

export function isSafeNextPath(
  value: string | null | undefined
): value is string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return false;

  if (protectedExactPaths.has(value)) return true;

  return /^\/studio\/[A-Za-z0-9_-]+$/.test(value);
}

export function loginPath(next: string): string {
  return `${routes.login}?next=${encodeURIComponent(next)}`;
}

export function resolveNextPath(value: string | null | undefined): string {
  return isSafeNextPath(value) ? value : routes.dashboard;
}
