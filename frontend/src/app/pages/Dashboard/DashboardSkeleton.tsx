import { AppSkeleton } from '@shared/ui'

export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <AppSkeleton key={i} width="100%" height="6rem" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <AppSkeleton width="100%" height="16rem" />
        <AppSkeleton width="100%" height="16rem" />
      </div>
      <AppSkeleton width="100%" height="12rem" />
    </div>
  )
}
