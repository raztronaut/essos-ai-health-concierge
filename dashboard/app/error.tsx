"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

/** Route-level error boundary. Renders when a server component throws. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-card border border-secondary/60 bg-card p-6 text-center">
      <h1 className="serif text-2xl">Something went wrong</h1>
      <p className="text-sm text-muted">
        The dashboard hit an unexpected error reading the local store. You can retry below.
      </p>
      <Button type="button" variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
