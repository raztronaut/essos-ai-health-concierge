/** Route-level loading fallback while a server component streams in. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-9 w-48 animate-pulse rounded-md bg-secondary/40" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-card border border-secondary/60 bg-card" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-card border border-secondary/60 bg-card" />
        ))}
      </div>
    </div>
  );
}
