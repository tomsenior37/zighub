import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PairDrawer } from "./PairDrawer";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface FetchCall {
  url: string;
  method: string;
  body: unknown;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function setupFetchSpy() {
  const calls: FetchCall[] = [];
  const fetchSpy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input);
    const method = init?.method ?? "GET";
    let body: unknown = null;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    calls.push({ url, method, body });
    if (url.includes("/api/network/permit-join")) {
      return Promise.resolve(jsonResponse({ active: true, remainingSec: 120 }));
    }
    if (url.includes("/api/devices")) {
      return Promise.resolve(jsonResponse([]));
    }
    return Promise.resolve(jsonResponse({}));
  });
  vi.stubGlobal("fetch", fetchSpy);
  return calls;
}

function renderDrawer(open: boolean, onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={client}>
        <PairDrawer open={open} onClose={onClose} defaultDurationSec={120} />
      </QueryClientProvider>,
    ),
  };
}

describe("PairDrawer", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not render when closed", () => {
    setupFetchSpy();
    renderDrawer(false);
    expect(screen.queryByRole("dialog", { name: /pair new device/i })).toBeNull();
  });

  it("opens the permit-join window on mount with the default duration", async () => {
    const calls = setupFetchSpy();
    renderDrawer(true);
    await waitFor(() => {
      const post = calls.find(
        (c) => c.url.includes("/api/network/permit-join") && c.method === "POST",
      );
      expect(post).toBeTruthy();
      expect(post?.body).toEqual({ durationSec: 120 });
    });
  });

  it('shows the "waiting for a device" empty state', async () => {
    setupFetchSpy();
    renderDrawer(true);
    expect(
      await screen.findByText(/waiting for a device — put it in pairing mode now/i),
    ).toBeInTheDocument();
  });

  it("Stop sends durationSec:0 and then closes", async () => {
    const calls = setupFetchSpy();
    const { onClose } = renderDrawer(true);
    const user = userEvent.setup();
    const stopBtn = await screen.findByRole("button", { name: /^stop$/i });
    await user.click(stopBtn);
    await waitFor(() => {
      const stopCall = calls.find(
        (c) =>
          c.url.includes("/api/network/permit-join") &&
          c.method === "POST" &&
          (c.body as { durationSec?: number }).durationSec === 0,
      );
      expect(stopCall).toBeTruthy();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
