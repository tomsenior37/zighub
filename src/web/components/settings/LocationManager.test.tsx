import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocationManager } from "./LocationManager";

function renderManager() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LocationManager />
    </QueryClientProvider>,
  );
}

describe("LocationManager", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith("/api/locations") && init?.method === "POST") {
          return Promise.resolve(
            new Response(JSON.stringify({ id: 2, name: "Bedroom", parent_id: null }), {
              status: 201,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        if (url.endsWith("/api/locations/1") && init?.method === "PATCH") {
          return Promise.resolve(
            new Response(JSON.stringify({ id: 1, name: "Lounge", parent_id: null }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        if (url.endsWith("/api/locations/1") && init?.method === "DELETE") {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        if (url.endsWith("/api/locations")) {
          return Promise.resolve(
            new Response(JSON.stringify([{ id: 1, name: "Kitchen", parent_id: null }]), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        return Promise.resolve(new Response("not found", { status: 404 }));
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds, renames, and deletes locations", async () => {
    const user = userEvent.setup();
    renderManager();

    expect(await screen.findByText("Kitchen")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/new location name/i), "Bedroom");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/locations",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Bedroom" }),
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: /rename/i }));
    const nameInput = screen.getByLabelText(/^location name$/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Lounge");
    await user.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/locations/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "Lounge" }),
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/locations/1", { method: "DELETE" });
    });
  });
});
