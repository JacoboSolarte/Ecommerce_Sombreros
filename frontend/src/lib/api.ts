// Browser-side API client. Same-origin (/api is rewritten to the backend).

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown> | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: Record<string, unknown> | null };
}

export async function parseError(res: Response): Promise<ApiError> {
  let body: ErrorBody | null = null;
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    body = null;
  }
  const err = body?.error;
  return new ApiError(
    res.status,
    err?.code ?? (res.status === 401 ? "NOT_AUTHENTICATED" : "INTERNAL_ERROR"),
    err?.message ?? "Algo salió mal. Inténtalo de nuevo en un momento.",
    err?.details ?? null,
  );
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

export function buildQuery(
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!query) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = opts;
  let res: Response;
  try {
    res = await fetch(`/api${path}${buildQuery(query)}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.",
    );
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Algo salió mal. Inténtalo de nuevo.";
}

/** Field-level errors if the API returns them in details.fields / details.errors. */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || !e.details) return {};
  const d = e.details as Record<string, unknown>;
  const src = (d.fields ?? d.errors ?? d) as unknown;
  const out: Record<string, string> = {};
  if (Array.isArray(src)) {
    for (const item of src) {
      if (item && typeof item === "object") {
        const o = item as { field?: string; loc?: unknown[]; message?: string; msg?: string };
        const f = o.field ?? (Array.isArray(o.loc) ? String(o.loc[o.loc.length - 1]) : undefined);
        const m = o.message ?? o.msg;
        if (f && m) out[f] = m;
      }
    }
  } else if (src && typeof src === "object") {
    for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
      else if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
    }
  }
  return out;
}
