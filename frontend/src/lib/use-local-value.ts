"use client";

import { useSyncExternalStore } from "react";

const EVENT = "cg-local-change";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** Reads a localStorage string without hydration mismatch (server value is `fallback`). */
export function useLocalValue(key: string, fallback = ""): string {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
}

export function setLocalValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage unavailable */
  }
}
