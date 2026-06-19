import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Clerk middleware (Next.js 16 uses `proxy.ts`; <=15 used `middleware.ts`).
 *
 * Attaches Clerk auth context to every request but does NOT wall the app:
 * signed-out visitors see the (demo-mode) dashboard and can sign in from the
 * sidebar to test real roles. Backend access is still gated server-side by
 * `ESSOS_REQUIRE_AUTH` on Convex when you want to fail closed. When Clerk isn't
 * configured (no publishable key), it's a plain passthrough.
 */
const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default hasClerk ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
