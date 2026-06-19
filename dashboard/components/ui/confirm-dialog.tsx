"use client";

import { useState } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";

/**
 * Destructive-action confirmation. Awaits `onConfirm`, surfaces any thrown
 * error inline, and keeps the dialog open until the action resolves.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  confirmLabel?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      description={description}
      footer={
        <>
          <Button disabled={pending} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button disabled={pending} onClick={handleConfirm} variant="danger">
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={title}
    >
      {error ? <p className="text-high text-sm">{error}</p> : null}
    </Dialog>
  );
}
