/**
 * Utility functions for date formatting
 */

/**
 * Formats a destroyed timestamp as a locale-aware date string
 * @param timestampDestroyed BigInt timestamp in seconds since epoch
 * @returns Formatted date string like "11/8/25" or "8/11/25" depending on locale
 */
export function formatDestroyedDate(timestampDestroyed: bigint): string {
  if (timestampDestroyed <= BigInt(0)) {
    return "";
  }

  // Convert BigInt seconds to milliseconds for Date constructor
  const timestampMs = Number(timestampDestroyed) * 1000;
  const date = new Date(timestampMs);

  // Get user's locale from browser, fallback to 'en-US'
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";

  // Format date using locale-aware formatting
  // Use short date format (M/D/YY or D/M/YY depending on locale)
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
  });

  return formatter.format(date);
}
