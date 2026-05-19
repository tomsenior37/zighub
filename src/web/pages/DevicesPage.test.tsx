import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { DevicesPage } from "./DevicesPage";
import type { DeviceGroup } from "../hooks/useDevices";

function fakeDeviceGroup(): DeviceGroup[] {
  return [
    {
      location: { id: 1, name: "Kitchen" },
      devices: [
        {
          z2m_id: "00:11",
          friendly_name: "kitchen-light",
          location_id: 1,
          model: "TS0001",
          manufacturer: "TuYa",
          role: "both",
          user_notes: null,
          created_at: "2026-05-17 10:00:00",
          last_seen_at: "2026-05-17 10:05:00",
          capabilities: [
            { type: "binary", property: "state", access: 7 },
            { type: "numeric", property: "brightness", access: 7 },
          ],
          online: true,
        },
      ],
    },
    {
      location: null,
      devices: [
        {
          z2m_id: "00:22",
          friendly_name: "unassigned-sensor",
          location_id: null,
          model: null,
          manufacturer: null,
          role: "both",
          user_notes: null,
          created_at: "2026-05-17 10:00:00",
          last_seen_at: null,
          capabilities: null,
          online: false,
        },
      ],
    },
  ];
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DevicesPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the loading state while fetching", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    renderPage();
    expect(screen.getByText(/loading devices/i)).toBeInTheDocument();
  });

  it("renders location groups and device cards on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Response(JSON.stringify(fakeDeviceGroup()), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    renderPage();

    expect(await screen.findByRole("heading", { name: /^kitchen$/i })).toBeInTheDocument();
    expect(screen.getByText("kitchen-light")).toBeInTheDocument();
    expect(screen.getByText("unassigned-sensor")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^unassigned$/i })).toBeInTheDocument();
  });

  it("renders the empty state when API returns an empty array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    renderPage();

    expect(await screen.findByRole("heading", { name: /no devices paired/i })).toBeInTheDocument();
  });

  it("renders an error state with a retry button on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Response("nope", { status: 500 })),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("sends manual device commands from exposed controls", async () => {
    const fetchSpy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/api/devices/00%3A11/command") && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ accepted: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify(fakeDeviceGroup()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("region", { name: /device controls/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^on$/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/devices/00%3A11/command",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ state: "ON" }),
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: /set brightness/i }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/devices/00%3A11/command",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ brightness: 127 }),
        }),
      );
    });
  });
});
