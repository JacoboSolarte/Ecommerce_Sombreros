import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-card bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Ingresa a tu cuenta</h1>
        <p className="mt-1 mb-6 text-ink-2">Para pagar, ver tus pedidos y guardar tu carrito.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
