import type { Metadata } from "next";
import { ProfileForm } from "@/components/account/profile-form";
import { requireUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const user = await requireUser("/cuenta");
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold sm:text-3xl">Mi cuenta</h1>
      <ProfileForm initial={user} />
    </>
  );
}
