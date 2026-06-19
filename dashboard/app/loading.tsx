/** Route-level loading fallback while a server component streams in. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <div className="h-9 w-48 animate-pulse rounded-md bg-secondary/40" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            className="h-24 animate-pulse rounded-card border border-border bg-card shadow-card"
            key={i}
          />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            className="h-20 animate-pulse rounded-card border border-border bg-card shadow-card"
            key={i}
          />
        ))}
      </div>
    </div>
  );
}
