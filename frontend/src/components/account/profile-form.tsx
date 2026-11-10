"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/auth";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { User } from "@/lib/types";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function ProfileForm({ initial }: { initial: User }) {
  const { setUser, logout } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: initial.fullName,
    phone: initial.phone ?? "",
    documentId: initial.documentId ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.fullName.trim().length < 2) errs.fullName = "Escribe tu nombre completo.";
    const phone = form.phone.replace(/[\s-]/g, "");
    if (phone && !/^(3\d{9}|\d{7,10})$/.test(phone))
      errs.phone = "Usa un celular de 10 dígitos que empiece por 3, o un fijo de 7 a 10 dígitos.";
    if (form.documentId && !/^[0-9A-Za-z.\-]{5,20}$/.test(form.documentId.trim()))
      errs.documentId = "Revisa el número de documento (de 5 a 20 caracteres).";
    setErrors(errs);
    setMsg(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const u = await api<User>("/users/me", {
        method: "PATCH",
        body: {
          fullName: form.fullName.trim(),
          phone: phone || null,
          documentId: form.documentId.trim() || null,
        },
      });
      setUser(u);
      setMsg({ tone: "success", text: "Guardamos tus datos." });
      router.refresh();
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      setMsg({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} noValidate className="rounded-card bg-surface p-5 sm:p-8">
        <h2 className="text-lg font-semibold">Tus datos</h2>
        <p className="mt-1 mb-5 text-ink-2">
          Correo: <span className="font-medium text-ink">{initial.email}</span> · Cliente desde {formatDate(initial.createdAt)}
        </p>
        {msg && <Alert tone={msg.tone} className="mb-4">{msg.text}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre completo" autoComplete="name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} required wrapperClassName="sm:col-span-2" />
          <Input label="Teléfono" type="tel" inputMode="tel" autoComplete="tel-national" value={form.phone} onChange={set("phone")} error={errors.phone} />
          <Input label="Documento de identidad" inputMode="numeric" value={form.documentId} onChange={set("documentId")} error={errors.documentId} hint="Opcional. Se usa para la factura." />
        </div>
        <div className="mt-6">
          <Button type="submit" size="lg" loading={busy}>
            Guardar cambios
          </Button>
        </div>
      </form>

      <section aria-labelledby="sesion" className="rounded-card bg-surface p-5 sm:p-8">
        <h2 id="sesion" className="text-lg font-semibold">Sesión</h2>
        <p className="mt-1 mb-4 text-ink-2">Cierra la sesión si usas un equipo compartido.</p>
        <Button
          variant="outline"
          size="lg"
          onClick={async () => {
            await logout();
            router.push("/");
            router.refresh();
          }}
        >
          <LogOut className="size-4" aria-hidden /> Cerrar sesión
        </Button>
      </section>
    </div>
  );
}
