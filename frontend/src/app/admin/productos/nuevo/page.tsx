import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NewProductPage() {
  return <ProductForm />;
}
