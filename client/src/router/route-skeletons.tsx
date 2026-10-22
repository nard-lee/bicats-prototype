import { Skeleton } from "@/components/ui/skeleton";

function PageHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="size-14 rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
    </div>
  );
}

export function AdminShellSkeleton() {
  return (
    <div className="flex h-svh overflow-hidden">
      <div className="hidden w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <div className="space-y-2 px-2 py-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="mt-auto space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="flex h-svh min-w-0 flex-1 flex-col">
        <div className="flex h-15 shrink-0 items-center gap-3 border-b px-4">
          <Skeleton className="size-7" />
          <Skeleton className="h-4 w-40" />
          <div className="ml-auto flex items-center gap-4">
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
        <main className="min-h-0 flex-1 space-y-6 overflow-auto p-6">
          <PageHeaderSkeleton />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    </div>
  );
}

export function CardsPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function TablePageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="rounded-xl border">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ml-auto h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="rounded-xl border">
        <div className="space-y-2 border-b p-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-40" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  );
}

export function CenteredCardSkeleton() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border p-8">
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto size-12 rounded-2xl" />
          <Skeleton className="mx-auto h-6 w-40" />
          <Skeleton className="mx-auto h-4 w-56" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

export function LandingSkeleton() {
  return (
    <div className="space-y-10 px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <Skeleton className="mx-auto h-10 w-3/4" />
        <Skeleton className="mx-auto h-5 w-1/2" />
        <Skeleton className="mx-auto h-11 w-44" />
      </div>
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

export function DocumentSkeleton() {
  return (
    <div className="min-h-svh space-y-6 bg-muted/30 py-6">
      <div className="mx-auto mb-6 flex w-full max-w-[210mm] items-center justify-between px-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <article className="mx-auto w-full max-w-[210mm] space-y-6 bg-white px-6 py-10 shadow-sm sm:px-[18mm] sm:py-[14mm]">
        <div className="space-y-2 border-b-2 border-black pb-3 text-center">
          <Skeleton className="mx-auto h-3 w-40" />
          <Skeleton className="mx-auto h-4 w-64" />
          <Skeleton className="mx-auto h-5 w-56" />
          <Skeleton className="mx-auto h-3 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={`h-3.5 ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
          ))}
        </div>
        <div className="flex justify-between gap-8 pt-10">
          <Skeleton className="h-16 w-56" />
          <Skeleton className="h-16 w-56" />
        </div>
      </article>
    </div>
  );
}
