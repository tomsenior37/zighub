export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    throw new ApiError(res.status, body, `GET ${path} returned ${res.status.toString()}`);
  }
  return (await res.json()) as T;
}

export async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    throw new ApiError(res.status, body, `POST ${path} returned ${res.status.toString()}`);
  }
  return (await res.json()) as T;
}

export async function patchJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    throw new ApiError(res.status, body, `PATCH ${path} returned ${res.status.toString()}`);
  }
  return (await res.json()) as T;
}

export async function deleteJson(path: string): Promise<void> {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    throw new ApiError(res.status, body, `DELETE ${path} returned ${res.status.toString()}`);
  }
}
