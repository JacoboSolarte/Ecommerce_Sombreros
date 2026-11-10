import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-card bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Crea tu cuenta</h1>
        <p className="mt-1 mb-6 text-ink-2">Toma un minuto y tu carrito se guarda.</p>
        <RegisterForm next={next} />
      </div>
    </div>
  );
}
