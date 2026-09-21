import { cn } from "@/utils";

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-muted/80 animate-shimmer", className)} />;
}

function StatCardSkeleton({ primary = false }: { primary?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4.5 flex flex-col justify-between min-h-[130px]",
        primary ? "bg-primary/10" : "bg-card border border-border/80",
      )}
    >
      <div className="flex items-center justify-between">
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="size-6 rounded-full" />
      </div>
      <SkeletonBar className="h-9 w-16 mt-1" />
      <SkeletonBar className="h-5 w-28 mt-2" />
    </div>
  );
}

function ProjectRowSkeleton() {
  return (
    <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/60 bg-background/50">
      <SkeletonBar className="size-10 rounded-xl" />
      <div className="flex-1 flex flex-col gap-2">
        <SkeletonBar className="h-4 w-1/3" />
        <SkeletonBar className="h-3 w-1/4" />
      </div>
      <SkeletonBar className="h-8 w-20 rounded-lg" />
    </div>
  );
}

function WidgetSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-xs min-h-[190px]">
      {children ?? (
        <div className="flex flex-col gap-4 h-full justify-between">
          <div className="flex items-center justify-between">
            <SkeletonBar className="h-4 w-24" />
            <SkeletonBar className="h-5 w-20 rounded-full" />
          </div>
          <SkeletonBar className="h-10 w-40 self-center" />
          <div className="flex justify-center gap-3">
            <SkeletonBar className="size-10 rounded-full" />
            <SkeletonBar className="size-10 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="max-w-7xl mx-auto px-3 py-5 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <SkeletonBar className="h-8 w-48" />
          <SkeletonBar className="h-4 w-64" />
        </div>
        <SkeletonBar className="h-10 w-32 rounded-full" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton primary />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <SkeletonBar className="h-5 w-32" />
                <SkeletonBar className="h-3 w-20" />
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <ProjectRowSkeleton />
              <ProjectRowSkeleton />
              <ProjectRowSkeleton />
              <ProjectRowSkeleton />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-5">
          <WidgetSkeleton />
          <WidgetSkeleton />
        </div>
      </div>
    </main>
  );
}
