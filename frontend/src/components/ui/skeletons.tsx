import { PageContainer, Skeleton } from "./misc";

function CardSkeleton() {
  return (
    <div className="rounded-card bg-surface p-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-4 w-11/12" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <Skeleton className="mt-3 h-5 w-1/3" />
    </div>
  );
}

export function GridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={className ?? "grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3"} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

function Live() {
  return <span className="sr-only" role="status">Cargando…</span>;
}

export function HomeSkeleton() {
  return (
    <>
      <Live />
      <div aria-hidden className="h-[300px] bg-shell-3 sm:h-[380px] lg:h-[430px]" />
      <PageContainer className="relative -mt-12 lg:-mt-24">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-56 bg-surface" />
          ))}
        </div>
      </PageContainer>
      <PageContainer className="mt-14">
        <GridSkeleton count={6} className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6" />
      </PageContainer>
    </>
  );
}

export function ListingSkeleton() {
  return (
    <PageContainer className="py-4 sm:py-6">
      <Live />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-9 w-72" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Skeleton className="hidden h-[32rem] lg:block" />
        <GridSkeleton count={9} className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3" />
      </div>
    </PageContainer>
  );
}

export function ProductSkeleton() {
  return (
    <PageContainer className="py-4 sm:py-6">
      <Live />
      <Skeleton className="h-4 w-64" />
      <div className="mt-4 grid gap-8 lg:grid-cols-12" aria-hidden>
        <Skeleton className="aspect-square lg:col-span-7" />
        <div className="space-y-4 lg:col-span-5">
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </PageContainer>
  );
}

export function BlockSkeleton() {
  return (
    <PageContainer className="py-4 sm:py-6">
      <Live />
      <Skeleton className="h-9 w-56" />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_22rem]" aria-hidden>
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    </PageContainer>
  );
}
