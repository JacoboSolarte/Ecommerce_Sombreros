"use client";

import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const FIELD =
  "block w-full rounded-field border bg-surface px-3 text-base text-ink placeholder:text-ink-2/70 " +
  "transition-colors duration-150 disabled:bg-tone disabled:text-ink-2";

function borderOf(error?: string) {
  return error ? "border-out" : "border-field hover:border-ink-2";
}

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FieldShell({ id, label, error, hint, required, className, children }: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
        {required && <span className="sr-only"> (obligatorio)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm font-medium text-out">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string, extra?: string) {
  const ids = [error ? `${id}-err` : hint ? `${id}-hint` : "", extra ?? ""].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
  wrapperClassName?: string;
  /** extra element id(s) that describe the input (e.g. password rules) */
  describedByExtra?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, wrapperClassName, describedByExtra, className, required, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <input
        ref={ref}
        id={fid}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint, describedByExtra)}
        className={cn(FIELD, "h-11 sm:h-10", borderOf(error), className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, wrapperClassName, className, required, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={fid}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint)}
        className={cn(FIELD, "min-h-24 py-2", borderOf(error), className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label?: string;
  /** when no visible label is wanted, still name the control */
  ariaLabel?: string;
  error?: string;
  hint?: string;
  id?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, ariaLabel, error, hint, id, wrapperClassName, className, required, children, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  const control = (
    <div className="relative">
      <select
        ref={ref}
        id={fid}
        required={required}
        aria-label={label ? undefined : ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint)}
        className={cn(FIELD, "h-11 cursor-pointer appearance-none pr-9 sm:h-10", borderOf(error), className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-2"
        aria-hidden
      />
    </div>
  );
  if (!label) return <div className={wrapperClassName}>{control}</div>;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      {control}
    </FieldShell>
  );
});
