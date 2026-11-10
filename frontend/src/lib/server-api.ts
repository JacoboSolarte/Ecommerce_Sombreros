import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, buildQuery, parseError } from "./api";
import type { User } from "./types";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export const SESSION_COOKIE = "cg_session";

interface ServerOptions {
  /** Forward the session cookie and never cache. */
  auth?: boolean;
  /** Seconds to cache public catalog data. Ignored when auth is true. */
  revalidate?: number;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export async function serverApi<T>(path: string, opts: ServerOptions = {}): Promise<T> {
  const { auth = false, revalidate = 30, query } = opts;
  const headers: Record<string, string> = {};
  if (auth) {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) headers.cookie = `${SESSION_COOKIE}=${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api${path}${buildQuery(query)}`, {
      headers,
      ...(auth ? { cache: "no-store" as const } : { next: { revalidate } }),
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "No pudimos conectarnos con la tienda. Inténtalo de nuevo en un momento.",
    );
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Returns null instead of throwing. */
export async function serverApiOrNull<T>(path: string, opts: ServerOptions = {}): Promise<T | null> {
  try {
    return await serverApi<T>(path, opts);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)) return null;
  return serverApiOrNull<User>("/auth/me", { auth: true });
}

/** For account pages: redirects to login when the session is missing or expired. */
export async function requireUser(next: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  return user;
}
