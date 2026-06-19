import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * A utility to merge Tailwind CSS classes safely, resolving conflicts (last-wins)
 * and filtering out conditional falsy values.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
