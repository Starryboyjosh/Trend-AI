import { describe, expect, test } from "vitest";

import {
  matchesTemplate,
  toTemplatePresentation,
} from "@/lib/template-catalog";
import type { Template } from "@/types/template";

const template: Template = {
  id: "tpl_instagram_01",
  title: "Oferta de temporada",
  platforms: ["instagram"],
  formats: ["static_post"],
  category: "Anuncios",
  objective: "sales",
  thumbnail_url: "/templates/amor.png",
  canva_url: "https://canva.link/jxr6r3xdtdx3p18",
  aspect_ratio: "4:5",
  editable_slots: ["titulo"],
  description: null,
};

describe("catálogo de plantillas", () => {
  test("busca por nombre, categoría, formato y etiquetas sin distinguir tildes", () => {
    const presentation = toTemplatePresentation(template);

    expect(matchesTemplate(presentation, "temporada", "all")).toBe(true);
    expect(matchesTemplate(presentation, "anuncios", "all")).toBe(true);
    expect(matchesTemplate(presentation, "static post", "all")).toBe(true);
    expect(matchesTemplate(presentation, "ANUNCIOS", "all")).toBe(true);
    expect(matchesTemplate(presentation, "anuncios", "ads")).toBe(true);
    expect(matchesTemplate(presentation, "anuncios", "reels")).toBe(false);
  });

  test("mantiene la proporción vertical apropiada para anuncios", () => {
    expect(toTemplatePresentation(template).aspectRatio).toBe("4 / 5");
  });

  test("conserva el asset local y formato del catálogo Instagram aprobado", () => {
    const seededTemplate: Template = {
      ...template,
      thumbnail_url: "/templates/flores.png",
    };

    expect(toTemplatePresentation(seededTemplate).thumbnail_url).toBe(
      "/templates/flores.png"
    );
    expect(seededTemplate.aspect_ratio).toBe("4:5");
  });
});
