import { useEffect, useState } from "react";

interface HealthResponse {
  status: string;
  version: string;
}

type HealthState =
  | { kind: "loading" }
  | { kind: "ok"; version: string }
  | { kind: "error"; message: string };

export function App() {
  const [health, setHealth] = useState<HealthState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/health");
        if (!res.ok) {
          throw new Error(`health endpoint returned ${res.status.toString()}`);
        }
        const data = (await res.json()) as HealthResponse;
        if (!cancelled) {
          setHealth({ kind: "ok", version: data.version });
        }
      } catch (err) {
        if (!cancelled) {
          setHealth({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>zighub</h1>
      {health.kind === "loading" && <p>Loading…</p>}
      {health.kind === "ok" && <p data-testid="version">Version {health.version}</p>}
      {health.kind === "error" && (
        <p data-testid="health-error">Could not reach backend: {health.message}</p>
      )}
    </main>
  );
}
