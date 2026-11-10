import type { Metadata } from "next";
import { OverviewView } from "@/components/admin/overview";

export const metadata: Metadata = { title: "Resumen" };

export default function AdminHomePage() {
  return <OverviewView />;
}
