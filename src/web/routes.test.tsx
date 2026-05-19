import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { routes } from "./routes";
import { createQueryClient } from "./queryClient";

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function renderAt(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("router", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith("/api/setup-state")) {
          return jsonResponse({ firstRunComplete: false });
        }
        if (url.endsWith("/api/zigbee/status")) {
          return jsonResponse({
            running: true,
            adapterMode: "mock",
            adapterReason: "ZIGBEE_ENABLED is not '1'",
            mockMode: true,
          });
        }
        return jsonResponse(null, 404);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("shows the current Zigbee adapter mode in the nav", async () => {
    renderAt("/devices");
    const mode = await screen.findByLabelText(/zigbee adapter mode/i);
    expect(mode).toHaveTextContent("Mock adapter - running");
    expect(mode).toHaveAttribute("title", expect.stringContaining("ZIGBEE_ENABLED is not '1'"));
  });
});
