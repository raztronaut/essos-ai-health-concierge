"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";

/**
 * Wires the dashboard to Convex, with Clerk auth when configured.
 *
 * - With `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set: ClerkProvider +
 *   ConvexProviderWithClerk, so Convex calls carry the signed-in concierge's
 *   identity and public functions are auth-gated.
 * - Without it (local demo): a plain ConvexProvider. Convex's `getConcierge`
 *   falls back to a dev concierge so the dashboard runs with no Clerk keys.
 */
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "http://127.0.0.1:3210";
const convex = new ConvexReactClient(convexUrl);
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!clerkKey) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  }
  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

/** True when Clerk auth is configured (used to conditionally render auth UI). */
export const clerkEnabled = Boolean(clerkKey);
