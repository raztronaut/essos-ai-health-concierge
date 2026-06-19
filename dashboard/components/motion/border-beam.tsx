"use client";

import dynamic from "next/dynamic";
import type { BorderBeamProps } from "./border-beam-impl";

/**
 * Lazily-loaded {@link BorderBeam}. The implementation pulls in the `motion`
 * runtime, so it is split into its own chunk and only fetched when a beam is
 * actually rendered (and never on the server — it's a decorative client-only
 * effect that returns `null` under `prefers-reduced-motion`).
 */
const BorderBeamLazy = dynamic(
  () => import("./border-beam-impl").then((m) => m.BorderBeam),
  { ssr: false }
);

export function BorderBeam(props: BorderBeamProps) {
  return <BorderBeamLazy {...props} />;
}
