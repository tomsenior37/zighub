import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { routes } from "./routes";
import { createQueryClient } from "./queryClient";

function renderAt(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("router", () => {
  it("renders the wizard page at /wizard", async () => {
    renderAt("/wizard");
    expect(await screen.findByRole("heading", { name: /setup wizard/i })).toBeInTheDocument();
  });

  it("renders the devices page at /devices", async () => {
    renderAt("/devices");
    expect(await screen.findByRole("heading", { name: /^devices$/i })).toBeInTheDocument();
  });

  it("renders the automations page at /automations", async () => {
    renderAt("/automations");
    expect(await screen.findByRole("heading", { name: /automations/i })).toBeInTheDocument();
  });

  it("renders the settings page at /settings", async () => {
    renderAt("/settings");
    expect(await screen.findByRole("heading", { name: /settings/i })).toBeInTheDocument();
  });

  it("renders the not-found page for unknown routes", async () => {
    renderAt("/nonsense");
    expect(await screen.findByRole("heading", { name: /page not found/i })).toBeInTheDocument();
  });

  it("redirects '/' to '/wizard' on first-run", async () => {
    renderAt("/");
    expect(await screen.findByRole("heading", { name: /setup wizard/i })).toBeInTheDocument();
  });

  it("renders the primary nav with all three base links", async () => {
    renderAt("/devices");
    const nav = await screen.findByRole("navigation", { name: /primary/i });
    expect(nav).toHaveTextContent("Devices");
    expect(nav).toHaveTextContent("Automations");
    expect(nav).toHaveTextContent("Settings");
  });

  it("includes the setup wizard link in the nav while first-run", async () => {
    renderAt("/wizard");
    const nav = await screen.findByRole("navigation", { name: /primary/i });
    expect(nav).toHaveTextContent("Setup wizard");
  });
});
