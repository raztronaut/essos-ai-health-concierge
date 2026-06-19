import Link from "next/link";

/** Shown for `notFound()` (e.g. an unknown conversation or patient id). */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-card bg-card p-6 text-center shadow-border">
      <h1 className="serif text-2xl">Not found</h1>
      <p className="text-muted text-sm">
        That conversation or patient doesn’t exist in the store.
      </p>
      <Link
        className="inline-block font-medium text-primary text-sm hover:underline"
        href="/"
      >
        ← Back to overview
      </Link>
    </div>
  );
}
