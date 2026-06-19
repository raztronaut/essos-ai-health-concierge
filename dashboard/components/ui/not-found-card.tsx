import { Card } from "./card";
import { TextLink } from "./text-link";

/**
 * Standardized "Not Found" card with a back link.
 * Consolidates duplicate fallbacks across conversation and patient detail views.
 */
export function NotFoundCard({
  message,
  backHref,
  backLabel,
}: {
  message: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <Card className="flex flex-col items-start gap-3 py-8">
      <p className="text-muted text-sm">{message}</p>
      <TextLink href={backHref}>← {backLabel}</TextLink>
    </Card>
  );
}
