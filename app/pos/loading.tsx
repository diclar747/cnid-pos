export default function POSLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="border-b bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 bg-muted rounded animate-pulse" />
            <div className="w-32 h-6 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-64 h-10 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="w-20 h-8 bg-muted rounded animate-pulse" />
            <div className="w-10 h-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar Skeleton */}
        <div className="w-64 border-r bg-card/30 p-4 space-y-4">
          <div className="w-full h-8 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-full h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="w-3/4 h-4 bg-muted rounded animate-pulse" />
                  <div className="w-1/2 h-3 bg-muted rounded animate-pulse" />
                  <div className="w-1/4 h-6 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Skeleton */}
        <div className="w-80 border-l bg-card/30 p-4 space-y-4">
          <div className="w-full h-8 bg-muted rounded animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 border rounded">
                <div className="w-12 h-12 bg-muted rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-muted rounded animate-pulse" />
                  <div className="w-1/2 h-3 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
