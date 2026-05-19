import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
          capabilities: null,
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

  it("renders a needs-setup tray before named location groups", async () => {
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

    expect(await screen.findByRole("heading", { name: /^needs setup$/i })).toBeInTheDocument();
    expect(screen.getByText(/name and place newly joined devices/i)).toBeInTheDocument();
    expect(screen.getByText("1 device")).toBeInTheDocument();
    expect(screen.getByText("unassigned-sensor")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^kitchen$/i })).toBeInTheDocument();
    expect(screen.getByText("kitchen-light")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^unassigned$/i })).toBeNull();
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
});
