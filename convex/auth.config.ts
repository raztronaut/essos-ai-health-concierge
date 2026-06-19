/**
 * Clerk -> Convex auth binding.
 *
 * Set `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment (e.g.
 * `npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev`)
 * to your Clerk Frontend API / issuer URL. The dashboard signs Convex calls with
 * a Clerk JWT (applicationID must be "convex" — create a "convex" JWT template
 * in the Clerk dashboard).
 *
 * Until this is configured, `getConcierge` falls back to a dev concierge unless
 * `ESSOS_REQUIRE_AUTH` is set, so the local demo runs without Clerk keys.
 */
export default {
  providers: [
    {
      domain:
        process.env.CLERK_JWT_ISSUER_DOMAIN ??
        "https://example.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
