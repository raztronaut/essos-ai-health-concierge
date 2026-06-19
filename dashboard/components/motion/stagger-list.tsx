"use client";

import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";

/**
 * Wraps a list of elements and fades/translates each one in with a short
 * stagger when it first mounts. Motion is purely decorative entrance polish,
 * so it is fully disabled under `prefers-reduced-motion` — the children render
 * exactly as-is, no transform, no opacity ramp.
 *
 * Usage:
 *   <StaggerList className="space-y-3">
 *     {items.map((item) => <Card key={item.id} ... />)}
 *   </StaggerList>
 */

// Strong ease-out curve (matches --ease-out token) and a sub-300ms reveal.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, ease: EASE_OUT },
  },
};

export function StaggerList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const items = Children.toArray(children).filter(isValidElement);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {items.map((child, index) => (
        <motion.div key={child.key ?? index} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
