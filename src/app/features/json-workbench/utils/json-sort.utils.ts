import type { JsonObject, JsonValue } from '../state/workbench.store';

export function sortJsonKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonKeys(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .reduce<JsonObject>((acc, key) => {
        acc[key] = sortJsonKeys(value[key]);
        return acc;
      }, {});
  }

  return value;
}
