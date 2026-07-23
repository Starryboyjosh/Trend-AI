"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { loginPath } from "@/lib/routes";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "error">(
    "checking"
  );

  useEffect(() => {
    if (isDemoModeEnabled()) {
      setState("ready");
      return;
    }

    let active = true;

    void api.auth
      .me()
      .then(() => {
        if (active) setState("ready");
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace(loginPath(pathname));
          return;
        }
        setState("error");
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (state === "checking") {
    return <main className="route-status">Comprobando tu sesión…</main>;
  }

  if (state === "error") {
    return (
      <main className="route-status" role="alert">
        No pudimos comprobar tu sesión. Actualiza la página para intentarlo de
        nuevo.
      </main>
    );
  }

  return <>{children}</>;
}
