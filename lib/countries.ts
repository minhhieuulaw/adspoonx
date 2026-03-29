/**
 * Single source of truth for supported countries.
 * Import from here instead of duplicating country lists.
 */

export const SUPPORTED_COUNTRIES = [
  "US", "GB", "CA", "AU", "DE", "FR", "NL", "IT", "BR", "MX",
] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

export const COUNTRY_INFO: Record<string, { label: string; flag: string }> = {
  ALL: { label: "All Countries", flag: "🌍" },
  US:  { label: "United States", flag: "🇺🇸" },
  GB:  { label: "United Kingdom", flag: "🇬🇧" },
  CA:  { label: "Canada", flag: "🇨🇦" },
  AU:  { label: "Australia", flag: "🇦🇺" },
  DE:  { label: "Germany", flag: "🇩🇪" },
  FR:  { label: "France", flag: "🇫🇷" },
  NL:  { label: "Netherlands", flag: "🇳🇱" },
  IT:  { label: "Italy", flag: "🇮🇹" },
  BR:  { label: "Brazil", flag: "🇧🇷" },
  MX:  { label: "Mexico", flag: "🇲🇽" },
};

/** Country codes with "ALL" prepended — for UI filter dropdowns */
export const COUNTRY_FILTER_OPTIONS = ["ALL", ...SUPPORTED_COUNTRIES] as const;

/** Validate if a country code is in our supported list */
export function isValidCountry(code: string): code is SupportedCountry {
  return (SUPPORTED_COUNTRIES as readonly string[]).includes(code.toUpperCase());
}
