// Phone helpers: country list (flag + calling code), validation, E.164
// formatting, and normalization so different local formats of the same
// number compare equal (e.g. 0501234567 == +380501234567 == 501234567).
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

export interface Country {
  iso: CountryCode;
  code: string; // calling code without "+", e.g. "380"
  flag: string; // emoji flag
  name: string; // full localized name, e.g. "Україна"
}

export const DEFAULT_COUNTRY: CountryCode = "UA";

// ISO-2 -> regional indicator emoji (🇺🇦 etc.)
function flagOf(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Localized full country names (Ukrainian, English fallback).
const regionNames = new Intl.DisplayNames(["uk", "en"], { type: "region" });
function nameOf(iso: string): string {
  try {
    return regionNames.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

// Full world list, default country first then alphabetically by full name.
// Built once at module load.
export const COUNTRIES: Country[] = getCountries()
  .map((iso) => ({ iso, code: getCountryCallingCode(iso), flag: flagOf(iso), name: nameOf(iso) }))
  .sort((a, b) => {
    if (a.iso === DEFAULT_COUNTRY) return -1;
    if (b.iso === DEFAULT_COUNTRY) return 1;
    return a.name.localeCompare(b.name, "uk");
  });

export function countryByIso(iso: string): Country | undefined {
  return COUNTRIES.find((c) => c.iso === iso);
}

// Validate a national (local) number for a given country. Empty -> false.
export function validatePhone(national: string, iso: CountryCode): boolean {
  const digits = (national || "").replace(/\D/g, "");
  if (!digits) return false;
  try {
    return isValidPhoneNumber(digits, iso);
  } catch {
    return false;
  }
}

// Build an E.164 string ("+380501234567") from a national number + country.
// Falls back to "+<code><digits>" if parsing fails.
export function toE164(national: string, iso: CountryCode): string {
  const digits = (national || "").replace(/\D/g, "");
  try {
    const parsed = parsePhoneNumber(digits, iso);
    if (parsed) return parsed.number;
  } catch {
    /* ignore */
  }
  return `+${getCountryCallingCode(iso)}${digits.replace(/^0+/, "")}`;
}

// Drop a single leading zero from a national number (used when prefilling a
// number like "0501234567" into a +380 field — the 0 is the trunk prefix).
export function stripLeadingZero(national: string): string {
  return (national || "").replace(/\D/g, "").replace(/^0/, "");
}

// Reduce any phone string to a comparable core: digits only, country code and
// any leading zero removed, keeping the last (up to) 9 significant digits.
// This makes 0501234567, 501234567 and +380501234567 all normalize to
// "501234567".
export function normalizePhone(raw: string | null | undefined): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  // Try a real parse first (handles all country codes correctly).
  try {
    const parsed = parsePhoneNumber(digits.startsWith("+") ? digits : `+${digits}`);
    if (parsed?.nationalNumber) return parsed.nationalNumber.replace(/^0+/, "");
  } catch {
    /* ignore */
  }
  digits = digits.replace(/^0+/, "");
  return digits.length > 9 ? digits.slice(-9) : digits;
}

// Split a stored phone (E.164 like "+380501234567", or any saved string) into
// a country + national part for editing in the PhoneListEditor.
export function splitStored(
  stored: string | null | undefined,
): { country: CountryCode; national: string } {
  const raw = (stored || "").trim();
  if (raw) {
    try {
      const parsed = parsePhoneNumber(raw.startsWith("+") ? raw : `+${raw}`);
      if (parsed?.country) {
        return { country: parsed.country, national: parsed.nationalNumber };
      }
    } catch {
      /* ignore */
    }
  }
  return {
    country: DEFAULT_COUNTRY,
    national: raw.replace(/\D/g, "").replace(/^0/, ""),
  };
}

export function samePhone(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return !!na && na === nb;
}

// Reduce a phone (full, partial, with or without code/trunk-zero) to its bare
// national digits for substring search. So "050", "38050", "+38050" and
// "+380501234567" all yield a value that prefixes the stored "501234567".
export function phoneSearchDigits(raw: string | null | undefined): string {
  const trimmed = (raw || "").trim();
  let d = trimmed.replace(/\D/g, "");
  if (!d) return "";
  // Prefer a real parse so the correct country code is stripped.
  try {
    const parsed = parsePhoneNumber(trimmed.startsWith("+") ? trimmed : `+${d}`);
    if (parsed?.nationalNumber) return parsed.nationalNumber.replace(/^0+/, "");
  } catch {
    /* ignore */
  }
  // Heuristic fallback for partial input: drop a leading UA code then trunk 0.
  d = d.replace(/^380/, "").replace(/^0+/, "");
  return d;
}

// True when `query` is a (prefix/substring) match of the stored phone's
// national digits. Empty query never matches.
export function phoneMatches(
  stored: string | null | undefined,
  query: string,
): boolean {
  const q = phoneSearchDigits(query);
  if (!q) return false;
  return phoneSearchDigits(stored).includes(q);
}
