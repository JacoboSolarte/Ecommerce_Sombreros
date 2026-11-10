"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { useAuth } from "@/context/auth";
import { errorMessage, fieldErrors, isApiError } from "@/lib/api";
import { safeNext } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function useAfterAuth(next?: string) {
  const router = useRouter();
  return () => {
    router.push(safeNext(next, "/"));
    router.refresh();
  };
}

export function LoginForm({ next }: { next?: string }) {
  const { login } = useAuth();
  const done = useAfterAuth(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = "Escribe un correo válido, por ejemplo nombre@correo.com.";
    if (!password) errs.password = "Escribe tu contraseña.";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
      done();
    } catch (err) {
      setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}
      <Input
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        required
      />
      <Input
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        required
      />
      <Button type="submit" full size="lg" loading={busy}>
        Ingresar
      </Button>
      <p className="text-center text-[15px] text-ink-2">
        ¿Primera vez aquí?{" "}
        <Link
          href={next ? `/registro?next=${encodeURIComponent(next)}` : "/registro"}
          className="font-medium text-link hover:underline"
        >
          Crea tu cuenta
        </Link>
      </p>
    </form>
  );
}

const RULES = [
  { id: "len", text: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { id: "letter", text: "Al menos una letra", test: (p: string) => /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(p) },
  { id: "digit", text: "Al menos un número", test: (p: string) => /\d/.test(p) },
];

export function RegisterForm({ next }: { next?: string }) {
  const { register } = useAuth();
  const done = useAfterAuth(next);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.fullName.trim().length < 2) errs.fullName = "Escribe tu nombre completo.";
    if (!EMAIL_RE.test(form.email.trim())) errs.email = "Escribe un correo válido, por ejemplo nombre@correo.com.";
    const phone = form.phone.replace(/[\s-]/g, "");
    if (phone && !/^(3\d{9}|\d{7,10})$/.test(phone))
      errs.phone = "Usa un celular de 10 dígitos que empiece por 3, o un fijo de 7 a 10 dígitos.";
    if (RULES.some((r) => !r.test(form.password))) errs.password = "La contraseña no cumple las reglas de abajo.";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: phone || undefined,
      });
      done();
    } catch (err) {
      const fe = fieldErrors(err);
      if (isApiError(err) && err.code === "EMAIL_TAKEN") setErrors({ email: err.message });
      else if (Object.keys(fe).length) setErrors(fe);
      else setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}
      <Input
        label="Nombre completo"
        autoComplete="name"
        value={form.fullName}
        onChange={set("fullName")}
        error={errors.fullName}
        required
      />
      <Input
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        value={form.email}
        onChange={set("email")}
        error={errors.email}
        required
      />
      <Input
        label="Celular (opcional)"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={form.phone}
        onChange={set("phone")}
        error={errors.phone}
        hint="Lo usamos solo para coordinar la entrega."
      />
      <div>
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          describedByExtra="pw-rules"
          required
        />
        <ul id="pw-rules" className="mt-2 space-y-1 text-sm">
          {RULES.map((r) => {
            const ok = r.test(form.password);
            return (
              <li key={r.id} className={cn("flex items-center gap-2", ok ? "text-ok" : "text-ink-2")}>
                {ok ? <Check className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}
                {r.text}
                <span className="sr-only">{ok ? ": cumple" : ": falta"}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <Button type="submit" full size="lg" loading={busy}>
        Crear cuenta
      </Button>
      <p className="text-center text-[15px] text-ink-2">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={next ? `/ingresar?next=${encodeURIComponent(next)}` : "/ingresar"}
          className="font-medium text-link hover:underline"
        >
          Ingresa
        </Link>
      </p>
    </form>
  );
}
