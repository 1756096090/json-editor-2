/**
 * convert.utils.ts
 * Pure TypeScript converters: JSON → CSV and JSON → XML.
 * Zero external dependencies.
 */

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue; }
type JsonArray = JsonValue[];

// ── CSV ─────────────────────────────────────────────────────────────────────

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Flatten a single object one level deep (nested objects → JSON string). */
function flattenObject(obj: JsonObject): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === 'object') {
      flat[k] = JSON.stringify(v);
    } else {
      flat[k] = v === null ? '' : String(v);
    }
  }
  return flat;
}

/**
 * Convert a JSON value to CSV.
 * - Array of objects → header + rows (one row per object).
 * - Array of primitives → single "value" column.
 * - Plain object → two columns: "key, value" (one row per entry).
 * - Primitive → single cell.
 */
export function jsonToCsv(value: JsonValue): string {
  // Array of objects → table
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
    // Collect all keys across every row (union)
    const keySet = new Set<string>();
    for (const row of value as JsonObject[]) {
      for (const k of Object.keys(row)) keySet.add(k);
    }
    const headers = Array.from(keySet);
    const lines: string[] = [headers.map(csvEscape).join(',')];
    for (const row of value as JsonObject[]) {
      const flat = flattenObject(row);
      lines.push(headers.map(h => csvEscape(flat[h] ?? '')).join(','));
    }
    return lines.join('\n');
  }

  // Array of primitives → single "value" column
  if (Array.isArray(value)) {
    return ['value', ...value.map(v => csvEscape(v))].join('\n');
  }

  // Plain object → key, value rows
  if (typeof value === 'object' && value !== null) {
    const obj = value as JsonObject;
    const lines = ['key,value'];
    for (const [k, v] of Object.entries(obj)) {
      lines.push(`${csvEscape(k)},${csvEscape(typeof v === 'object' ? JSON.stringify(v) : v)}`);
    }
    return lines.join('\n');
  }

  // Primitive
  return `value\n${csvEscape(value)}`;
}

// ── XML ─────────────────────────────────────────────────────────────────────

function xmlEscapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function xmlEscapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Make a valid XML element name from any key string. */
function safeTag(key: string): string {
  // Replace spaces and leading digits/special chars
  let tag = key.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (/^[^a-zA-Z_]/.test(tag)) tag = '_' + tag;
  return tag || '_item';
}

function serializeXmlValue(value: JsonValue, tag: string, indent: string): string {
  const pad = indent;
  const childPad = indent + '  ';

  if (value === null) {
    return `${pad}<${tag} nil="true"/>`;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return `${pad}<${tag}>${xmlEscapeText(String(value))}</${tag}>`;
  }

  if (typeof value === 'string') {
    return `${pad}<${tag}>${xmlEscapeText(value)}</${tag}>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}<${tag}/>`;
    const items = value.map(item => serializeXmlValue(item, 'item', childPad)).join('\n');
    return `${pad}<${tag}>\n${items}\n${pad}</${tag}>`;
  }

  // Object
  const obj = value as JsonObject;
  const keys = Object.keys(obj);
  if (keys.length === 0) return `${pad}<${tag}/>`;
  const entries = keys.map(k => serializeXmlValue(obj[k], safeTag(k), childPad)).join('\n');
  return `${pad}<${tag}>\n${entries}\n${pad}</${tag}>`;
}

/**
 * Convert a JSON value to an XML string with a <root> wrapper.
 */
export function jsonToXml(value: JsonValue): string {
  const header = '<?xml version="1.0" encoding="UTF-8"?>';
  if (Array.isArray(value)) {
    if (value.length === 0) return `${header}\n<root/>`;
    const items = value.map(item => serializeXmlValue(item, 'item', '  ')).join('\n');
    return `${header}\n<root>\n${items}\n</root>`;
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as JsonObject;
    const keys = Object.keys(obj);
    if (keys.length === 0) return `${header}\n<root/>`;
    const entries = keys.map(k => serializeXmlValue(obj[k], safeTag(k), '  ')).join('\n');
    return `${header}\n<root>\n${entries}\n</root>`;
  }
  return `${header}\n<root>${xmlEscapeText(String(value ?? ''))}</root>`;
}
