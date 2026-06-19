"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef } from "react";

/**
 * Centered modal dialog. Closes on Escape or backdrop click and locks body
 * scroll while open. Entrance/exit motion is decorative and disabled under
 * `prefers-reduced-motion`.
 *
 * S-Tier Accessibility:
 * - Implements a native, lightweight focus trap.
 * - Manages initial focus and returns focus on close.
 * - Correctly binds `aria-labelledby` and `aria-describedby`.
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
  const containerRef = useRef<HTMLDivElement>(null);

  const titleId = `dialog-title-${useId()}`;
  const descId = `dialog-desc-${useId()}`;

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

    // Focus management: save active element to return focus later
    const previousActiveElement = document.activeElement as HTMLElement;

    // Focus first focusable element or the container itself
    const container = containerRef.current;
    if (container) {
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0]?.focus();
      } else {
        container.focus();
      }
    }

    // Focus trap: keep Tab focus within the dialog
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key === "Tab" && container) {
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(
          (el) => !el.hasAttribute("disabled") && el.style.display !== "none"
        );

        if (focusable.length === 0) {
          return;
        }

        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleFocusTrap);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", handleFocusTrap);
      document.body.style.overflow = prevOverflow;
      previousActiveElement?.focus();
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
            aria-describedby={description ? descId : undefined}
            aria-labelledby={titleId}
            aria-modal="true"
            className="w-full max-w-lg rounded-card border border-border bg-card p-6 shadow-card outline-none"
            exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            initial={
              reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }
            }
            ref={containerRef}
            role="dialog"
            tabIndex={-1}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="mb-4">
              <h2 className="serif text-balance text-2xl" id={titleId}>
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-pretty text-muted text-sm" id={descId}>
                  {description}
                </p>
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
