"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

/** Route-level error boundary. Renders when a server component throws. */
export default function DashboardError({
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
    <div className="mx-auto max-w-md space-y-4 rounded-card bg-card p-6 text-center shadow-border">
      <h1 className="serif text-2xl">Something went wrong</h1>
      <p className="text-muted text-sm">
        The dashboard hit an unexpected error loading your data. You can retry
        below.
      </p>
      <Button onClick={reset} type="button" variant="primary">
        Try again
      </Button>
    </div>
  );
}
