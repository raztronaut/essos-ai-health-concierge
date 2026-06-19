import { useUser } from "@clerk/nextjs";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { clerkEnabled } from "@/app/ConvexClientProvider";

/**
 * S-Tier custom hook to resolve the active concierge's signature name and viewAs scope.
 * Flattens the previous 4-level component wrapper chain into a single declarative hook.
 */
export function useConciergeSignature() {
  const { user } = useUser();
  const { viewAs, selected } = useDemoIdentity();

  const clerkName = clerkEnabled ? (user?.firstName ?? "") : "";
  const defaultName = selected
    ? (selected.name.split(" ")[0] ?? clerkName)
    : clerkName;

  return {
    defaultName,
    viewAs,
  };
}
