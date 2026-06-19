"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * An animated light beam that traces the border of its nearest positioned
 * ancestor. Drop it inside any `relative` container with a rounded border to
 * draw attention to it — used to mark an AI-drafted concierge reply that is
 * waiting for human review.
 *
 * The beam rides an CSS `offset-path` rectangle sized to the host and is masked
 * strictly to the border ring using the `.border-beam-mask` class, so it never
 * bleeds or paints over the card's content.
 *
 * Defaults mirror the reference "Large · Colorful · 50%" preset
 * (see https://beam.jakubantalik.com).
 */
export function BorderBeam({
  className,
  size = 220,
  duration = 7,
  delay = 0,
  radius = 12,
  borderWidth = 1.5,
  strength = 0.5,
  tone = "colorful",
}: {
  className?: string;
  /** Length of the traveling beam in pixels — the "Large" preset is ~220. */
  size?: number;
  /** Seconds for one full lap around the border. */
  duration?: number;
  /** Stagger multiple beams by offsetting their start. */
  delay?: number;
  /** Corner radius of the host border, in pixels (matches `rounded-card`). */
  radius?: number;
  /** Thickness of the glowing line. */
  borderWidth?: number;
  /** 0–1 intensity controlling opacity and glow — "Strength" in the preset. */
  strength?: number;
  /** Color treatment for the beam. */
  tone?: "colorful" | "mono";
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return null;
  }

  const opacity = Math.max(0, Math.min(1, strength));
  const gradient =
    tone === "colorful"
      ? "conic-gradient(from 0deg, transparent 0deg, #ff7a59 70deg, #f5b73d 140deg, #5ec8a8 210deg, #5b8def 280deg, transparent 340deg)"
      : "conic-gradient(from 0deg, transparent 0deg, var(--color-ink) 150deg, transparent 300deg)";

  return (
    <div
      aria-hidden
      className={cn("border-beam-mask", className)}
      style={{
        borderWidth,
        borderRadius: radius,
      }}
    >
      <motion.span
        animate={{ offsetDistance: ["0%", "100%"] }}
        className="absolute top-0 left-0 aspect-square"
        initial={{ offsetDistance: "0%" }}
        style={{
          width: size,
          opacity,
          background: gradient,
          // Travel the border of the card
          offsetPath: `rect(0 auto auto 0 round ${radius}px)`,
          // Add a subtle bloom blur that scales with strength
          filter: `blur(${Math.round(2 + opacity * 4)}px)`,
        }}
        transition={{
          duration,
          delay: -delay,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />
    </div>
  );
}
