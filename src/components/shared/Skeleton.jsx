// src/components/shared/Skeleton.jsx

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Balance card */}
      <Skeleton className="h-40 w-full rounded-2xl" />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}
