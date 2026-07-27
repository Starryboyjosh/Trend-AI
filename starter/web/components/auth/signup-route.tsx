"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { routes } from "@/lib/routes";

type RouteState = "checking" | "ready" | "error";

export function SignupRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<RouteState>("checking");

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        await api.auth.me();
        if (active) router.replace(routes.dashboard);
        return;
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          if (active) setState("error");
          return;
        }
      }

      try {
        await api.auth.signup.get();
        if (active) setState("ready");
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && [404, 410].includes(error.status)) {
          router.replace(routes.register);
        } else {
          setState("error");
        }
      }
    }

    void check();
    return () => {
      active = false;
    };
  }, [router]);

  if (state === "checking") {
    return <main className="route-status">Recuperando tu registro…</main>;
  }

  if (state === "error") {
    return (
      <main className="route-status" role="alert">
        No pudimos recuperar tu registro. Actualiza la página para intentarlo
        de nuevo.
      </main>
    );
  }

  return <>{children}</>;
}
