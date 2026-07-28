import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: "template=tpl_instagram_01",
  replace: vi.fn(), push: vi.fn(),
  api: {
    businesses: { list: vi.fn(), brandProfile: { get: vi.fn() } }, templates: { list: vi.fn() }, capabilities: { get: vi.fn() },
    projects: { startCreationFlow: vi.fn(), completeCreationFlow: vi.fn(), create: vi.fn(), get: vi.fn(), updateArtifactVersion: vi.fn(), duplicate: vi.fn() },
    conversations: { create: vi.fn(), sendMessage: vi.fn() }, artifacts: { createVariation: vi.fn() },
  },
}));
const { api, push, replace } = mocks;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock("next/image", () => ({ default: (props: { alt: string }) => <img alt={props.alt} /> }));
vi.mock("@/lib/api", () => ({
  api: mocks.api,
  createIdempotencyKey: vi.fn(() => "stable-key"),
  ApiError: class ApiError extends Error { constructor(_status: number, _code: string, message: string) { super(message); } },
}));

import { InstagramPostFlow, validateInstagramDraft } from "@/components/studio/instagram-post-flow";
import { instagramFlowCopy } from "@/lib/instagram-flow-copy";

const template = { id: "tpl_instagram_01", title: "Producto destacado", platforms: ["instagram"], formats: ["static_post"], objective: "sales", thumbnail_url: "/template.png", canva_url: "https://canva.link/jxr6r3xdtdx3p18", aspect_ratio: "4:5" };
const post = { artifact_type: "social_post", platform: "instagram", hook: "Café artesanal", caption: "Caption inicial", call_to_action: "Visítanos hoy", hashtags: ["#Cafe"], visual_direction: "Brief 4:5 para Canva", format_recommendation: "static_post", assumptions: [] };

function configure() {
  api.businesses.list.mockResolvedValue([{ id: "business-1", name: "Café", primary_product: "Café", target_audience: "Vecinos" }]);
  api.businesses.brandProfile.get.mockResolvedValue({ value_proposition: "Café local", voice_tones: ["friendly"] });
  api.templates.list.mockResolvedValue([template]);
  api.capabilities.get.mockResolvedValue({ copywriter: { quality_levels: ["fast"] } });
  api.projects.startCreationFlow.mockResolvedValue({ id: "flow-1", flow_started_at: "2026-01-01T00:00:00Z" });
  api.projects.completeCreationFlow.mockResolvedValue({ id: "flow-1" });
  api.conversations.create.mockResolvedValue({ id: "conversation-1" });
  api.conversations.sendMessage.mockResolvedValue({ artifact: post, artifact_id: "artifact-1" });
  api.projects.create.mockResolvedValue({ id: "project-1" });
  api.projects.updateArtifactVersion.mockResolvedValue({});
  api.projects.duplicate.mockResolvedValue({ id: "project-copy" });
  api.artifacts.createVariation.mockResolvedValue({ artifact: { ...post, caption: "Variación" } });
}

beforeEach(() => { mocks.query = "template=tpl_instagram_01"; replace.mockReset(); push.mockReset(); Object.values(api).forEach((group) => Object.values(group).forEach((value) => { if (typeof value === "function" && "mockReset" in value) value.mockReset(); })); configure(); });

describe("InstagramPostFlow", () => {
  test("loads authorized context, preselects an approved template, generates and saves once", async () => {
    render(<InstagramPostFlow />);
    await screen.findByText("Producto destacado");
    expect(api.projects.startCreationFlow).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("option", { name: "Equilibrado" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("2. Objetivo o tema"), { target: { value: "Promoción" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar post" }));
    await screen.findByDisplayValue("Caption inicial");
    fireEvent.change(screen.getByLabelText("Texto del post"), { target: { value: "Caption editado" } });
    const save = screen.getByRole("button", { name: "Guardar post" });
    fireEvent.click(save); fireEvent.click(save);
    await waitFor(() => expect(api.projects.create).toHaveBeenCalledTimes(1));
    expect(api.projects.create.mock.calls[0]?.[1]).toEqual({ idempotencyKey: "stable-key" });
    expect(api.projects.updateArtifactVersion).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/studio/new?project=project-1");
  });

  test("restores a saved project without starting telemetry again", async () => {
    mocks.query = "project=project-1";
    api.projects.get.mockResolvedValue({ id: "project-1", artifact_id: "artifact-1", source_template_id: template.id, artifact_snapshot: { ...post, caption: "Caption editado" } });
    render(<InstagramPostFlow />);
    await screen.findByDisplayValue("Caption editado");
    expect(api.projects.startCreationFlow).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Brief 4:5 para Canva")).toBeInTheDocument();
  });

  test("validates the editor, preserves a failed draft, warns before unload and reuses duplicate key", async () => {
    expect(validateInstagramDraft({ caption: "", call_to_action: "CTA", hashtags: ["#ok"], visual_direction: "brief" }, instagramFlowCopy.es)).toContain("caption");
    expect(validateInstagramDraft({ caption: "ok", call_to_action: "CTA", hashtags: ["", "#a", "#b", "#c", "#d", "#e"], visual_direction: "brief" }, instagramFlowCopy.es)).toContain("hashtags");
    render(<InstagramPostFlow />);
    await screen.findByText("Producto destacado");
    fireEvent.change(screen.getByLabelText("2. Objetivo o tema"), { target: { value: "Promoción" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar post" }));
    await screen.findByDisplayValue("Caption inicial");
    fireEvent.change(screen.getByLabelText("Texto del post"), { target: { value: "Borrador local" } });
    const unload = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(unload)).toBe(false);
    api.projects.create.mockRejectedValueOnce(new Error("save failed"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar post" }));
    await screen.findByRole("alert");
    expect(screen.getByDisplayValue("Borrador local")).toBeInTheDocument();
  });

  test("replays duplicate safely and marks a generation failure as terminal telemetry", async () => {
    mocks.query = "project=project-1";
    api.projects.get.mockResolvedValue({ id: "project-1", artifact_id: "artifact-1", source_template_id: template.id, artifact_snapshot: post });
    render(<InstagramPostFlow />);
    await screen.findByRole("button", { name: "Duplicar proyecto" });
    const duplicate = screen.getByRole("button", { name: "Duplicar proyecto" });
    fireEvent.click(duplicate); fireEvent.click(duplicate);
    await waitFor(() => expect(api.projects.duplicate).toHaveBeenCalledTimes(1));
    expect(api.projects.duplicate.mock.calls[0]?.[1]).toEqual({ idempotencyKey: "stable-key" });
    expect(push).toHaveBeenCalledWith("/studio/new?project=project-copy");
  });

  test("marks the started flow as failed when generation errors", async () => {
    api.conversations.sendMessage.mockRejectedValueOnce(new Error("provider error"));
    render(<InstagramPostFlow />);
    await screen.findByText("Producto destacado");
    fireEvent.change(screen.getByLabelText("2. Objetivo o tema"), { target: { value: "Promoción" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar post" }));
    await waitFor(() => expect(api.projects.completeCreationFlow).toHaveBeenCalledWith("flow-1", "failed"));
  });
});
