import { useDemoIdentity } from "@/features/demo/demo-identity";

/**
 * Resolves the active concierge's signature name and viewAs scope.
 * Clerk user data is read from DemoIdentityProvider (only calls Clerk hooks
 * when Clerk is configured), so this hook is safe in local demo mode.
 */
export function useConciergeSignature() {
  const { viewAs, selected, realFirstName } = useDemoIdentity();

  const defaultName = selected
    ? (selected.name.split(" ")[0] ?? realFirstName)
    : realFirstName;

  return {
    defaultName,
    viewAs,
  };
}
