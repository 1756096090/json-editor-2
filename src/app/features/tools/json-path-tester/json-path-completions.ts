import { evaluateJsonPath } from './json-path';

/** Suggest complete expressions using the objects reached by the current path. */
export function completeJsonPath(source: string, expression: string): string[] {
  try {
    const root: unknown = JSON.parse(source);
    const text = expression.trim();
    let parent = text || '$';
    let prefix = '';
    const partial = text.match(/^(.*)\.([\w$-]*)$/);
    let hasContainer = false;
    try {
      hasContainer = evaluateJsonPath(root, text).some(({ value }) => value !== null && typeof value === 'object');
    } catch { /* An incomplete expression can still have valid completions. */ }
    if (partial && !partial[1].endsWith('.') && !hasContainer) {
      parent = partial[1];
      prefix = partial[2];
    }
    const matches = evaluateJsonPath(root, parent);
    const suggestions = new Set<string>();
    for (const { value } of matches.slice(0, 100)) {
      if (Array.isArray(value)) {
        if (!prefix) {
          suggestions.add(`${parent}[*]`);
          value.slice(0, 5).forEach((_, index) => suggestions.add(`${parent}[${index}]`));
        }
      } else if (value !== null && typeof value === 'object') {
        for (const key of Object.keys(value)) {
          if (!key.toLowerCase().startsWith(prefix.toLowerCase())) continue;
          // Quoted notation preserves keys with spaces, dots and numeric starts.
          if (/^[A-Za-z_$][\w$-]*$/.test(key)) suggestions.add(`${parent}.${key}`);
          else if (!/["\\]/.test(key)) suggestions.add(`${parent}[${JSON.stringify(key)}]`);
          if (suggestions.size >= 50) break;
        }
      }
      if (suggestions.size >= 50) break;
    }
    return [...suggestions].slice(0, 50);
  } catch {
    return [];
  }
}
