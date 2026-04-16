/**
 * json-yaml.utils.ts
 * Pure TypeScript JSON → YAML serializer. Zero external dependencies.
 * Produces valid YAML 1.2 compatible with Kubernetes, GitHub Actions, etc.
 */

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue; }
type JsonArray = JsonValue[];

// YAML reserved scalars that must be quoted when used as string values
const YAML_RESERVED = new Set([
  'true', 'false', 'null', '~', 'yes', 'no', 'on', 'off',
  'True', 'False', 'Null', 'Yes', 'No', 'On', 'Off',
  'TRUE', 'FALSE', 'NULL', 'YES', 'NO', 'ON', 'OFF',
]);

// Characters that force quoting in a plain scalar
const FORCE_QUOTE_RE = /[:#\[\]{},&*?|\-<>=!%@`'"\\]|^\s|\s$|^$/;
// Looks like a number (int, float, hex, octal, inf, nan)
const LOOKS_LIKE_NUMBER = /^[-+]?(0x[\da-f]+|0o[0-7]+|[0-9]+(\.[0-9]*)?(e[+-]?[0-9]+)?|\.inf|\.nan)$/i;

function needsQuoting(s: string): boolean {
  if (s.length === 0) return true;
  if (YAML_RESERVED.has(s)) return true;
  if (LOOKS_LIKE_NUMBER.test(s)) return true;
  if (FORCE_QUOTE_RE.test(s)) return true;
  return false;
}

function quoteDoubleString(s: string): string {
  const escaped = s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\0/g, '\\0')
    .replace(/\x07/g, '\\a')
    .replace(/\x08/g, '\\b')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\x0b/g, '\\v')
    .replace(/\f/g, '\\f')
    .replace(/\r/g, '\\r')
    .replace(/\x1b/g, '\\e');
  return `"${escaped}"`;
}

function serializeString(s: string, indent: number): string {
  // Multiline → block scalar (literal style |)
  if (s.includes('\n')) {
    const pad = '  '.repeat(indent);
    const lines = s.split('\n');
    // Trailing newline is implicit in literal style
    const trailingNl = s.endsWith('\n');
    const chomped = trailingNl ? '|' : '|-';
    const body = lines
      .map(l => (l.length === 0 ? '' : `${pad}  ${l}`))
      .join('\n');
    return `${chomped}\n${body}`;
  }
  if (needsQuoting(s)) return quoteDoubleString(s);
  return s;
}

function serializeScalar(v: JsonPrimitive): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '.nan';
    if (!Number.isFinite(v)) return v > 0 ? '.inf' : '-.inf';
    return String(v);
  }
  return v; // string handled separately
}

function isScalar(v: JsonValue): boolean {
  return v === null || typeof v !== 'object' || Array.isArray(v) === false
    ? (v === null || typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string')
    : false;
}

function quoteKey(k: string): string {
  if (needsQuoting(k)) return quoteDoubleString(k);
  return k;
}

function serializeValue(v: JsonValue, indent: number): string {
  // Scalar
  if (v === null || typeof v === 'boolean' || typeof v === 'number') {
    return serializeScalar(v);
  }
  if (typeof v === 'string') {
    return serializeString(v, indent);
  }

  const pad = '  '.repeat(indent);

  // Array
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return v
      .map((item) => {
        if (item === null || typeof item === 'boolean' || typeof item === 'number') {
          return `${pad}- ${serializeScalar(item)}`;
        }
        if (typeof item === 'string') {
          const sv = serializeString(item, indent + 1);
          // Block scalar already contains newlines; place on next line
          if (sv.startsWith('|') || sv.startsWith('>')) {
            return `${pad}- ${sv}`;
          }
          return `${pad}- ${sv}`;
        }
        if (Array.isArray(item)) {
          if (item.length === 0) return `${pad}- []`;
          // Nested array: use block sequence with extra indent
          const nested = serializeValue(item, indent + 1);
          return `${pad}-\n${nested}`;
        }
        // Object inside array: first key on same line as dash
        const entries = Object.entries(item as JsonObject);
        if (entries.length === 0) return `${pad}- {}`;
        const firstKey = quoteKey(entries[0][0]);
        const firstVal = entries[0][1];
        let result = '';
        if (firstVal === null || typeof firstVal !== 'object') {
          const sv = typeof firstVal === 'string'
            ? serializeString(firstVal, indent + 1)
            : serializeScalar(firstVal as JsonPrimitive);
          result = `${pad}- ${firstKey}: ${sv}`;
        } else {
          result = `${pad}- ${firstKey}:\n${serializeValue(firstVal, indent + 2)}`;
        }
        for (const [k, childVal] of entries.slice(1)) {
          const key = quoteKey(k);
          if (childVal === null || typeof childVal !== 'object') {
            const sv = typeof childVal === 'string'
              ? serializeString(childVal, indent + 1)
              : serializeScalar(childVal as JsonPrimitive);
            result += `\n${pad}  ${key}: ${sv}`;
          } else {
            result += `\n${pad}  ${key}:\n${serializeValue(childVal, indent + 2)}`;
          }
        }
        return result;
      })
      .join('\n');
  }

  // Object
  const entries = Object.entries(v);
  if (entries.length === 0) return '{}';
  return entries
    .map(([k, child]) => {
      const key = quoteKey(k);
      if (child === null || typeof child === 'boolean' || typeof child === 'number') {
        return `${pad}${key}: ${serializeScalar(child)}`;
      }
      if (typeof child === 'string') {
        const sv = serializeString(child, indent + 1);
        if (sv.startsWith('|') || sv.startsWith('>')) {
          return `${pad}${key}: ${sv}`;
        }
        return `${pad}${key}: ${sv}`;
      }
      if (Array.isArray(child)) {
        if (child.length === 0) return `${pad}${key}: []`;
        return `${pad}${key}:\n${serializeValue(child, indent + 1)}`;
      }
      // Nested object
      if (Object.keys(child).length === 0) return `${pad}${key}: {}`;
      return `${pad}${key}:\n${serializeValue(child, indent + 1)}`;
    })
    .join('\n');
}

/**
 * Convert a parsed JSON value to a YAML string.
 * Throws if the input cannot be serialized.
 */
export function jsonToYaml(value: JsonValue): string {
  return serializeValue(value, 0);
}

/**
 * Parse a JSON string and convert it to YAML.
 * Returns `{ yaml, error }` — one of the two will be non-empty.
 */
export function convertJsonToYaml(jsonText: string): { yaml: string; error: string } {
  if (!jsonText.trim()) return { yaml: '', error: '' };
  try {
    const parsed = JSON.parse(jsonText) as JsonValue;
    const yaml = jsonToYaml(parsed);
    return { yaml, error: '' };
  } catch (e) {
    return { yaml: '', error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}
