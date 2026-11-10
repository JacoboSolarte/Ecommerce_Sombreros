"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type Side = "center" | "bottom" | "right" | "left";

const SIDE: Record<Side, string> = {
  center:
    "dialog-center m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-card",
  bottom:
    "sheet-bottom mx-0 mt-auto mb-0 w-full max-w-none max-h-[88dvh] rounded-t-[12px] sm:m-auto sm:w-[min(32rem,calc(100vw-2rem))] sm:rounded-card",
  right: "sheet-right ml-auto mr-0 my-0 h-dvh max-h-none w-[min(26rem,100vw)] max-w-none rounded-none",
  left: "sheet-left mr-auto ml-0 my-0 h-dvh max-h-none w-[min(22rem,92vw)] max-w-none rounded-none",
};

const PANEL = "bg-surface p-0 text-ink shadow-2xl"; // taste-skill-ignore

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: Side;
  /** visually hide the title (it still names the dialog) */
  hideTitle?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** Modal built on the native <dialog>: focus trap, Esc, and inert background come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  side = "center",
  hideTitle,
  children,
  footer,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && d.open) {
      d.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        document.documentElement.style.overflow = "";
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className={cn(PANEL, SIDE[side], className)}
    >
      {open && (
        <div className="flex max-h-[inherit] min-h-0 flex-col" style={{ height: side === "right" || side === "left" ? "100dvh" : undefined }}>
          <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3">
            <h2 id={titleId} className={cn("text-lg font-semibold", hideTitle && "sr-only")}>
              {title}
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Cerrar"
              className="-mr-2 grid size-10 place-items-center rounded-full text-ink hover:bg-tone"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && <div className="bg-tile px-5 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** A sheet is a dialog docked to an edge (bottom on phones). */
export function Sheet(props: Omit<DialogProps, "side"> & { side?: Exclude<Side, "center"> }) {
  return <Dialog {...props} side={props.side ?? "bottom"} />;
}
