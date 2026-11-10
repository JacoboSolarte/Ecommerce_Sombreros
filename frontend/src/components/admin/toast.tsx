"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error";
interface ToastItem {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const FLOATING = "pointer-events-auto flex items-center gap-2 rounded-card bg-ink px-4 py-3 text-sm text-white shadow-lg"; // taste-skill-ignore

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const push = useCallback((text: string, tone: Tone = "success") => {
    const id = nextId.current++;
    setItems((cur) => [...cur, { id, text, tone }]);
    window.setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 5000);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 left-4 z-[70] flex flex-col items-center gap-2 sm:left-auto sm:items-end"
      >
        {items.map((t) => (
          <div key={t.id} role="status" className={cn(FLOATING, "menu-in")}>
            {t.tone === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-[#7fd1a4]" aria-hidden />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-[#f2a39d]" aria-hidden />
            )}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
