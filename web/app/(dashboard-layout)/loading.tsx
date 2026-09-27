import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant Navigations App Shell for dashboard routes.
 * Prefetched with Partial Prefetching so soft navigations show UI immediately.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading page">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-24" />
        <Skeleton className="col-span-12 h-72 lg:col-span-7" />
        <Skeleton className="col-span-12 h-72 lg:col-span-5" />
        <Skeleton className="col-span-12 h-40 lg:col-span-4" />
        <Skeleton className="col-span-12 h-40 lg:col-span-4" />
        <Skeleton className="col-span-12 h-40 lg:col-span-4" />
        <Skeleton className="col-span-12 h-80" />
      </div>
    </div>
  );
}
