"use client";

import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { FieldShell } from "@/components/ui/field";

const BASE =
  "block w-full rounded-field border bg-surface px-3 text-sm text-ink placeholder:text-ink-2/70 " +
  "transition-colors duration-150 disabled:bg-tone disabled:text-ink-2";

const border = (error?: string) => (error ? "border-out" : "border-field hover:border-ink-2");

function describe(id: string, error?: string, hint?: string) {
  return error ? `${id}-err` : hint ? `${id}-hint` : undefined;
}

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const AInput = forwardRef<
  HTMLInputElement,
  BaseProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & { id?: string }
>(function AInput({ label, error, hint, wrapperClassName, id, className, required, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <input
        ref={ref}
        id={fid}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(fid, error, hint)}
        className={cn(BASE, "h-10", border(error), className)}
        {...rest}
      />
    </FieldShell>
  );
});

export const ATextarea = forwardRef<
  HTMLTextAreaElement,
  BaseProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & { id?: string }
>(function ATextarea({ label, error, hint, wrapperClassName, id, className, required, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={fid}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(fid, error, hint)}
        className={cn(BASE, "min-h-28 py-2", border(error), className)}
        {...rest}
      />
    </FieldShell>
  );
});

export const ASelect = forwardRef<
  HTMLSelectElement,
  BaseProps & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> & { id?: string }
>(function ASelect({ label, error, hint, wrapperClassName, id, className, required, children, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={fid}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe(fid, error, hint)}
          className={cn(BASE, "h-10 cursor-pointer appearance-none pr-9", border(error), className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-2"
          aria-hidden
        />
      </div>
    </FieldShell>
  );
});
