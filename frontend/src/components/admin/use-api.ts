"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, buildQuery } from "@/lib/api";

type Query = Record<string, string | number | boolean | undefined | null>;

interface Result<T> {
  key: string;
  data?: T;
  error?: ApiError;
}

/**
 * GET helper for admin blocks. `data` keeps the previous value while a new one loads
 * (`refreshing`), `loading` is only true before the first answer, `reload` retries.
 */
export function useApi<T>(path: string | null, query?: Query) {
  const qs = buildQuery(query);
  const key = path === null ? "" : `${path}${qs}`;
  const [tick, setTick] = useState(0);
  const [res, setRes] = useState<Result<T> | null>(null);

  useEffect(() => {
    if (path === null) return;
    const ac = new AbortController();
    const id = `${path}${qs}#${tick}`;
    api<T>(`${path}${qs}`, { signal: ac.signal })
      .then((data) => setRes({ key: id, data }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setRes({
          key: id,
          error:
            e instanceof ApiError
              ? e
              : new ApiError(0, "NETWORK_ERROR", "Algo salió mal. Inténtalo de nuevo."),
        });
      });
    return () => ac.abort();
  }, [path, qs, tick]);

  const currentId = `${key}#${tick}`;
  const current = res && res.key === currentId ? res : null;
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return {
    data: current?.data ?? res?.data,
    error: current?.error,
    loading: path !== null && !current && !res?.data,
    refreshing: path !== null && !current && !!res?.data,
    reload,
  };
}
