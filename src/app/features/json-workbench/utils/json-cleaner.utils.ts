import type { JsonValue } from '../state/workbench.store';

export interface JsonCleanOptions {
  removeNull: boolean;
  removeEmptyStrings: boolean;
  removeEmptyArrays: boolean;
  removeEmptyObjects: boolean;
}

export const DEFAULT_JSON_CLEAN_OPTIONS: JsonCleanOptions = {
  removeNull: true,
  removeEmptyStrings: true,
  removeEmptyArrays: true,
  removeEmptyObjects: true,
};

export function cleanJson(value: JsonValue, opts: JsonCleanOptions): JsonValue | undefined {
  if (opts.removeNull && value === null) return undefined;
  if (opts.removeEmptyStrings && value === '') return undefined;

  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => cleanJson(item, opts))
      .filter((item): item is JsonValue => item !== undefined);
    if (opts.removeEmptyArrays && cleaned.length === 0) return undefined;
    return cleaned;
  }

  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      const result = cleanJson(child, opts);
      if (result !== undefined) {
        cleaned[key] = result;
      }
    }
    if (opts.removeEmptyObjects && Object.keys(cleaned).length === 0) return undefined;
    return cleaned;
  }

  return value;
}

export function countJsonEntries(value: JsonValue): number {
  if (Array.isArray(value)) {
    return value.reduce<number>((count, child) => count + 1 + countJsonEntries(child), 0);
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value).reduce<number>((count, child) => count + 1 + countJsonEntries(child), 0);
  }

  return 0;
}
