/**
 * json-value-translator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Deep-walks a parsed JSON value and translates ONLY string values through a
 * pluggable translator function. Keys, numbers, booleans, null, and structure
 * are always preserved. Failed translations keep the original string and are
 * reported in the stats.
 */

import type { JsonValue } from '../state/workbench.store';

export type TranslateFn = (
  value: string,
  sourceLang: string,
  targetLang: string
) => Promise<string>;

export interface TranslateJsonStats {
  stringsFound: number;
  stringsTranslated: number;
  errors: string[];
  sourceLang: string;
  targetLang: string;
}

export interface TranslateJsonResult {
  value: JsonValue;
  stats: TranslateJsonStats;
}

export async function translateJsonStringValues(
  value: JsonValue,
  translator: TranslateFn,
  sourceLang: string,
  targetLang: string
): Promise<TranslateJsonResult> {
  const stats: TranslateJsonStats = {
    stringsFound: 0,
    stringsTranslated: 0,
    errors: [],
    sourceLang,
    targetLang,
  };

  const walk = async (node: JsonValue): Promise<JsonValue> => {
    if (typeof node === 'string') {
      stats.stringsFound++;
      try {
        const translated = await translator(node, sourceLang, targetLang);
        stats.stringsTranslated++;
        return translated;
      } catch (error) {
        stats.errors.push(error instanceof Error ? error.message : String(error));
        return node;
      }
    }

    if (Array.isArray(node)) {
      const out: JsonValue[] = [];
      for (const item of node) {
        out.push(await walk(item));
      }
      return out;
    }

    if (node !== null && typeof node === 'object') {
      const out: Record<string, JsonValue> = {};
      for (const [key, child] of Object.entries(node)) {
        out[key] = await walk(child);
      }
      return out;
    }

    // number | boolean | null — untouched
    return node;
  };

  const translated = await walk(value);
  return { value: translated, stats };
}
