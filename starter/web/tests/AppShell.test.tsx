import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AppShell } from "@/components/shell/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/assistant",
}));

describe("AppShell", () => {
  test("marks the active route and keeps navigation names available", () => {
    render(
      <AppShell>
        <p>Contenido de prueba</p>
      </AppShell>
    );

    expect(
      screen.getAllByRole("link", { name: "Nuevo chat" })[0]
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("complementary", { name: "Navegacion principal" })
    ).toBeInTheDocument();
    expect(screen.getByText("Contenido de prueba")).toBeInTheDocument();
  });
});
