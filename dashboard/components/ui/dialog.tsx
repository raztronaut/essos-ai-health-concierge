"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect } from "react";

/**
 * Centered modal dialog. Closes on Escape or backdrop click and locks body
 * scroll while open. Entrance/exit motion is decorative and disabled under
 * `prefers-reduced-motion`.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 px-4 py-10 backdrop-blur-[2px]"
          exit={{ opacity: 0 }}
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-modal="true"
            className="w-full max-w-lg rounded-card border border-border bg-card p-6 shadow-card"
            exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            initial={
              reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }
            }
            role="dialog"
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="mb-4">
              <h2 className="serif text-2xl">{title}</h2>
              {description ? (
                <p className="mt-1 text-muted text-sm">{description}</p>
              ) : null}
            </div>
            {children}
            {footer ? (
              <div className="mt-6 flex justify-end gap-2">{footer}</div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
