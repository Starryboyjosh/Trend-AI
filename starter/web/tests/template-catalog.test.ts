import { describe, expect, test } from "vitest";

import {
  matchesTemplate,
  toTemplatePresentation,
} from "@/lib/template-catalog";
import type { Template } from "@/types/template";

const template: Template = {
  id: "template-demo-4",
  title: "Oferta de temporada",
  platforms: ["instagram"],
  formats: ["static_post"],
  category: "Anuncios",
  objective: "sales",
  thumbnail_url: "/templates/amor.png",
  editable_slots: ["titulo"],
  description: null,
};

describe("catálogo de plantillas", () => {
  test("busca por nombre, categoría, formato y etiquetas sin distinguir tildes", () => {
    const presentation = toTemplatePresentation(template);

    expect(matchesTemplate(presentation, "temporada", "all")).toBe(true);
    expect(matchesTemplate(presentation, "anuncios", "all")).toBe(true);
    expect(matchesTemplate(presentation, "static post", "all")).toBe(true);
    expect(matchesTemplate(presentation, "FLORES", "all")).toBe(true);
    expect(matchesTemplate(presentation, "flores", "ads")).toBe(true);
    expect(matchesTemplate(presentation, "flores", "reels")).toBe(false);
  });

  test("mantiene la proporción vertical apropiada para anuncios", () => {
    expect(toTemplatePresentation(template).aspectRatio).toBe("4 / 5");
  });

  test("usa un asset local para las miniaturas del seed backend", () => {
    const seededTemplate: Template = {
      ...template,
      id: "tpl_reel_01",
      thumbnail_url: "/static/thumbnails/reel-promo.svg",
    };

    expect(toTemplatePresentation(seededTemplate).thumbnail_url).toBe(
      "/templates/video-mar.png"
    );
  });
});
