"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AssistantRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const conversation = searchParams.get("conversation");
    router.replace(
      conversation
        ? `/studio/${encodeURIComponent(conversation)}`
        : "/studio/new"
    );
  }, [router, searchParams]);
  return <main className="route-status">Abriendo Studio…</main>;
}

export default function AssistantRedirect() {
  return (
    <Suspense fallback={<main className="route-status">Abriendo Studio…</main>}>
      <AssistantRedirectContent />
    </Suspense>
  );
}
