"use client";

import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { clerkEnabled } from "@/app/ConvexClientProvider";

/**
 * Sidebar identity widget. With Clerk configured it shows the signed-in
 * concierge + a sign-out control; otherwise a "demo concierge" label so the
 * local demo reads honestly without auth keys.
 */
export function ConciergeIdentity() {
  if (!clerkEnabled) {
    return (
      <div className="rounded-control border border-border bg-surface px-3 py-2 text-[11px] text-muted">
        Signed in as <span className="font-medium text-ink">Demo concierge</span>
        <div className="mt-0.5">Add Clerk keys to enable real accounts.</div>
      </div>
    );
  }
  return <ClerkIdentity />;
}

function ClerkIdentity() {
  const { user } = useUser();
  return (
    <div className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2">
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
        <span className="min-w-0 truncate text-xs text-ink">
          {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Concierge"}
        </span>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="text-xs font-medium text-primary hover:underline">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
    </div>
  );
}
