"use client";

import type { Variants } from "motion/react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";

export interface StaggerListProps {
  children: ReactNode;
  className?: string;
}

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

/**
 * Animated implementation behind the `./stagger-list` wrapper. Pulls in the
 * `motion` runtime, so it is loaded as a separate chunk; the wrapper renders
 * the plain children until this resolves.
 */
export function StaggerList({ children, className }: StaggerListProps) {
  const reduceMotion = useReducedMotion();
  const items = Children.toArray(children).filter(isValidElement);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate="show"
      className={className}
      initial="hidden"
      variants={container}
    >
      {items.map((child, index) => (
        <motion.div key={child.key ?? index} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
