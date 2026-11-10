import { AccountNav } from "@/components/account/account-nav";
import { PageContainer } from "@/components/ui/misc";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer className="py-4 sm:py-6">
      <div className="grid items-start gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-6">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </PageContainer>
  );
}
