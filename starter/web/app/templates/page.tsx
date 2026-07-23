"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { TemplateLibrary } from "@/components/templates/template-library";
import { api, ApiError } from "@/lib/api";
import {
  createProjectFromTemplate,
  MissingBusinessError,
} from "@/lib/template-project";
import type { Template } from "@/types/template";

export default function TemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.templates
      .list()
      .then((items) => setTemplates(items as unknown as Template[]))
      .catch((reason) =>
        setError(
          reason instanceof ApiError
            ? reason.message
            : "No pudimos comprobar las plantillas."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  async function useTemplate(template: Template) {
    setError("");
    try {
      const project = await createProjectFromTemplate(template.id);
      router.push(`/projects/${encodeURIComponent(project.id)}`);
    } catch (reason) {
      if (reason instanceof MissingBusinessError) {
        router.push("/onboarding");
        return;
      }
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos crear el proyecto desde esta plantilla."
      );
    }
  }

  return (
    <AppShell>
      <main className="app-page templates-page">
        {error ? (
          <p className="page-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="route-status">Preparando catálogo…</p>
        ) : (
          <TemplateLibrary templates={templates} onUse={useTemplate} />
        )}
      </main>
    </AppShell>
  );
}
