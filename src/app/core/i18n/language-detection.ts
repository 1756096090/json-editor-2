/**
 * Picks the UI language from what the browser tells us, with no network call:
 * Spanish for people in a Spanish-speaking country, English otherwise.
 *
 * Browsers do not expose the country directly, so three signals are combined:
 *   1. The preferred language is Spanish (`es`, `es-MX`, …).
 *   2. Any preferred locale has a Spanish-speaking region (`en-MX`, `ca-ES`, …).
 *   3. The time zone belongs to a Spanish-speaking country (`America/Bogota`, …).
 */

export type Lang = 'es' | 'en';

/** ISO 3166-1 alpha-2 codes of countries where Spanish is an official language. */
export const SPANISH_SPEAKING_COUNTRIES: ReadonlySet<string> = new Set([
  'ES', 'MX', 'GT', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'DO', 'PR',
  'CO', 'VE', 'EC', 'PE', 'BO', 'CL', 'AR', 'PY', 'UY', 'GQ',
]);

/** IANA time zones located in Spanish-speaking countries (canonical names + common aliases). */
const SPANISH_SPEAKING_TIME_ZONES: ReadonlySet<string> = new Set([
  // Spain
  'Europe/Madrid', 'Africa/Ceuta', 'Atlantic/Canary',
  // Mexico
  'America/Mexico_City', 'America/Cancun', 'America/Merida', 'America/Monterrey',
  'America/Matamoros', 'America/Chihuahua', 'America/Ciudad_Juarez', 'America/Ojinaga',
  'America/Mazatlan', 'America/Bahia_Banderas', 'America/Hermosillo', 'America/Tijuana',
  'Mexico/General', 'Mexico/BajaNorte', 'Mexico/BajaSur',
  // Central America & Caribbean
  'America/Guatemala', 'America/El_Salvador', 'America/Tegucigalpa', 'America/Managua',
  'America/Costa_Rica', 'America/Panama', 'America/Havana', 'Cuba',
  'America/Santo_Domingo', 'America/Puerto_Rico',
  // South America
  'America/Bogota', 'America/Caracas', 'America/Guayaquil', 'Pacific/Galapagos',
  'America/Lima', 'America/La_Paz', 'America/Santiago', 'America/Punta_Arenas',
  'Pacific/Easter', 'Chile/Continental', 'Chile/EasterIsland', 'America/Asuncion',
  'America/Montevideo', 'America/Buenos_Aires', 'America/Cordoba', 'America/Mendoza',
  'America/Catamarca', 'America/Jujuy', 'America/Rosario',
  // Africa
  'Africa/Malabo',
]);

export function isSpanishSpeakingTimeZone(timeZone: string): boolean {
  return SPANISH_SPEAKING_TIME_ZONES.has(timeZone) || timeZone.startsWith('America/Argentina/');
}

/** Region subtag of a BCP 47 tag (`es-MX` → `MX`, `zh-Hant-TW` → `TW`), or null. */
export function regionOf(locale: string): string | null {
  const parts = locale.replace(/_/g, '-').split('-').slice(1);
  const region = parts.find((part) => /^[A-Za-z]{2}$/.test(part) || /^\d{3}$/.test(part));
  return region ? region.toUpperCase() : null;
}

export function detectLanguage(languages: readonly string[], timeZone: string | undefined): Lang {
  const preferred = languages[0]?.toLowerCase() ?? '';
  if (preferred === 'es' || preferred.startsWith('es-') || preferred.startsWith('es_')) return 'es';

  if (languages.some((locale) => SPANISH_SPEAKING_COUNTRIES.has(regionOf(locale) ?? ''))) {
    return 'es';
  }

  if (timeZone && isSpanishSpeakingTimeZone(timeZone)) return 'es';

  return 'en';
}

/** Reads the browser signals; safe outside a browser (falls back to English). */
export function detectBrowserLanguage(): Lang {
  if (typeof navigator === 'undefined') return 'en';
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language ?? ''];
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timeZone = undefined;
  }
  return detectLanguage(languages, timeZone);
}
