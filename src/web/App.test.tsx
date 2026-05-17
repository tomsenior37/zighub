import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Response(JSON.stringify({ status: "ok", version: "1.2.3" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the version returned by /health", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("version")).toHaveTextContent("Version 1.2.3");
    });
  });

  it("shows an error message when the backend is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("health-error")).toHaveTextContent("network down");
    });
  });
});
