import type { SVGProps } from "react";

/** Small document glyph for the "drafted from" source pills. */
export function DocIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      role="presentation"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

/** Eve's mark — a small four-point sparkle to flag autonomous AI replies. */
export function SparkleIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      role="presentation"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M12 0c.5 6.2 5.3 11 11.5 11.5C17.3 12 12.5 16.8 12 23c-.5-6.2-5.3-11-11.5-11.5C6.7 11 11.5 6.2 12 0Z" />
    </svg>
  );
}
