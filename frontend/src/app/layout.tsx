import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth";
import { CartProvider } from "@/context/cart";
import { getCurrentUser, serverApiOrNull } from "@/lib/server-api";
import type { Category } from "@/lib/types";
import { CategoryStrip, HeaderMain } from "@/components/layout/header-parts";
import { Footer } from "@/components/layout/footer";
import { StoreChrome } from "@/components/layout/store-chrome";
import { AddedSheet } from "@/components/layout/added-sheet";

// The catalog and the session come from the API at request time.
export const dynamic = "force-dynamic";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Casa Guaico | Sombreros de iraca tejidos a mano en Nariño",
    template: "%s | Casa Guaico",
  },
  description:
    "Sombreros de iraca artesanales tejidos en Sandoná y otros municipios de Nariño, Colombia. Elige tu talla, revisa quién lo tejió y recíbelo en casa.",
};

export const viewport: Viewport = {
  themeColor: "#14382C",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    serverApiOrNull<Category[]>("/categories", { revalidate: 300 }),
  ]);
  const cats = categories ?? [];
  return (
    <html lang="es-CO" className={figtree.variable}>
      <body className="flex min-h-dvh flex-col antialiased">
        <AuthProvider initialUser={user}>
          <CartProvider>
            <StoreChrome
              header={
                <header className="z-40 bg-shell lg:sticky lg:top-0">
                  <HeaderMain categories={cats} />
                  <CategoryStrip categories={cats} />
                </header>
              }
              footer={<Footer categories={cats} />}
            >
              {children}
            </StoreChrome>
            <AddedSheet />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
