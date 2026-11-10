import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, serverApiOrNull } from "@/lib/server-api";
import type { AdminOrderList, InventoryRow } from "@/lib/types";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { default: "Panel administrativo", template: "%s | Panel Casa Guaico" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/admin");

  if (user.role !== "admin") {
    // The attempt is logged by the API (audit_log) when it denies the request.
    await serverApiOrNull("/admin/categories", { auth: true });
    return (
      <main className="grid min-h-dvh place-items-center bg-frame px-4">
        <div className="w-full max-w-md rounded-2xl border border-edge bg-surface p-8 text-center">
          <h1 className="text-[22px] font-semibold text-balance">No tienes acceso al panel administrativo</h1>
          <p className="mt-2 text-ink-2">
            Tu cuenta ({user.email}) no tiene rol de administrador. Si crees que es un error, pídele acceso a quien
            administra la tienda.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/" variant="secondary">
              Ir a la tienda
            </Button>
            <Button href="/cuenta" variant="outline">
              Mi cuenta
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const [pending, paid, low] = await Promise.all([
    serverApiOrNull<AdminOrderList>("/admin/orders", { auth: true, query: { status: "pending", pageSize: 1 } }),
    serverApiOrNull<AdminOrderList>("/admin/orders", { auth: true, query: { status: "paid", pageSize: 1 } }),
    serverApiOrNull<InventoryRow[]>("/admin/inventory", { auth: true, query: { lowStock: true } }),
  ]);

  return (
    <AdminShell
      counts={{
        pending: pending?.total ?? 0,
        paid: paid?.total ?? 0,
        lowStock: low?.length ?? 0,
      }}
    >
      {children}
    </AdminShell>
  );
}
