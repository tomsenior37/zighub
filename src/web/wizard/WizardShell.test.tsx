import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WizardShell } from "./WizardShell";

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <WizardShell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("WizardShell", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("[]", { status: 200 }))),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts on the Welcome step", () => {
    renderShell();
    expect(screen.getByRole("heading", { name: /welcome to zighub/i })).toBeInTheDocument();
  });

  it("advances when 'Set up a new network' is clicked", async () => {
    renderShell();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /set up a new network/i }));
    expect(screen.getByRole("heading", { name: /pick a coordinator/i })).toBeInTheDocument();
  });

  it("Back returns to the previous step", async () => {
    renderShell();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /set up a new network/i }));
    await user.click(screen.getByRole("button", { name: /^back$/i }));
    expect(screen.getByRole("heading", { name: /welcome to zighub/i })).toBeInTheDocument();
  });

  it("Skip button is hidden on non-skippable steps and visible on the devices step", async () => {
    renderShell();
    const user = userEvent.setup();
    expect(screen.queryByRole("button", { name: /skip for now/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: /set up a new network/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i })); // -> network
    await user.click(screen.getByRole("button", { name: /^next$/i })); // -> devices
    expect(screen.getByRole("heading", { name: /pair your devices/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip for now/i })).toBeInTheDocument();
  });

  it("restore-local option shows the coming-soon callout without advancing", async () => {
    renderShell();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /restore from local backup/i }));
    expect(screen.getByRole("region", { name: /restore not available/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back to options/i }));
    expect(screen.getByRole("heading", { name: /welcome to zighub/i })).toBeInTheDocument();
  });

  it("Next is hidden on the final step", async () => {
    renderShell();
    const user = userEvent.setup();
    for (let i = 0; i < 4; i++) {
      const buttons = screen.queryAllByRole("button", { name: /^next$/i });
      if (buttons[0]) await user.click(buttons[0]);
      else {
        // Welcome step uses the path card to advance
        await user.click(screen.getByRole("button", { name: /set up a new network/i }));
      }
    }
    expect(screen.getByRole("heading", { name: /you're all set/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^next$/i })).toBeNull();
  });
});
