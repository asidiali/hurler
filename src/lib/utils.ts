import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize invisible/special whitespace characters that break JSON parsing.
 * Replaces various Unicode whitespace characters with their standard equivalents.
 */
export function sanitizeJsonWhitespace(text: string): string {
  return text
    // Non-breaking space (NBSP) → regular space
    .replace(/\u00A0/g, " ")
    // Various Unicode spaces → regular space
    .replace(/[\u2000-\u200A]/g, " ")
    // Zero-width spaces and joiners → remove
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // Line/paragraph separators → newline
    .replace(/[\u2028\u2029]/g, "\n")
    // Narrow no-break space → regular space
    .replace(/\u202F/g, " ")
    // Ideographic space → regular space
    .replace(/\u3000/g, " ");
}
