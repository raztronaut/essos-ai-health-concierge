import { type ReactNode, useState } from "react";
import { Button } from "./button";

/**
 * An S-Tier hook to orchestrate dialog form state and submissions.
 * Standardizes pending states, error handling, and success callbacks.
 */
export function useDialogForm<TData, TResult>(
  submitFn: (data: TData) => Promise<TResult> | TResult,
  onSuccess: (result: TResult) => void
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: TData) => {
    setPending(true);
    setError(null);
    try {
      const result = await submitFn(data);
      onSuccess(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      throw err;
    } finally {
      setPending(false);
    }
  };

  return { pending, error, handleSubmit, setError };
}

/**
 * A standard form container for dialogs.
 * Enforces consistent layout, error rendering, and footer actions.
 */
export function DialogForm({
  children,
  onSubmit,
  onClose,
  pending,
  error,
  submitLabel = "Save",
  pendingLabel = "Saving...",
}: {
  children: ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  pending: boolean;
  error: string | null;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-4">{children}</div>

      {error ? <p className="mt-3 text-high text-xs">{error}</p> : null}

      <div className="mt-6 flex justify-end gap-2">
        <Button disabled={pending} onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
