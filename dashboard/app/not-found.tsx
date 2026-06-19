import Link from "next/link";

/** Shown for `notFound()` (e.g. an unknown conversation or patient id). */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-card border border-secondary/60 bg-card p-6 text-center">
      <h1 className="serif text-2xl">Not found</h1>
      <p className="text-sm text-muted">
        That conversation or patient doesn’t exist in the store.
      </p>
      <Link href="/" className="inline-block text-sm font-medium text-primary hover:underline">
        ← Back to overview
      </Link>
    </div>
  );
}
