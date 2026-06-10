/**
 * json-yaml.utils.ts
 * Pure TypeScript JSON → YAML serializer. Zero external dependencies.
 * Produces valid YAML 1.2 compatible with Kubernetes, GitHub Actions, etc.
 */

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue; }
type JsonArray = JsonValue[];
interface YamlLine { indent: number; text: string; lineNumber: number; }

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

export function yamlToJsonValue(yamlText: string): JsonValue {
  const lines = toYamlLines(yamlText);
  if (lines.length === 0) return null;

  const [value, nextIndex] = parseYamlNode(lines, 0, lines[0].indent);
  if (nextIndex < lines.length) {
    throw new Error(`Unexpected content on line ${lines[nextIndex].lineNumber}.`);
  }

  return value;
}

function toYamlLines(yamlText: string): YamlLine[] {
  return yamlText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((rawLine, index) => {
      if (/^\t+/.test(rawLine)) {
        throw new Error(`Line ${index + 1}: tabs are not allowed for indentation.`);
      }

      const indent = rawLine.match(/^ */)?.[0].length ?? 0;
      return {
        indent,
        text: stripYamlComment(rawLine.slice(indent)).trimEnd(),
        lineNumber: index + 1,
      };
    })
    .filter((line) => line.text.trim() !== '');
}

function stripYamlComment(text: string): string {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inDouble && escaped) {
      escaped = false;
      continue;
    }
    if (inDouble && ch === '\\') {
      escaped = true;
      continue;
    }
    if (!inDouble && ch === "'") inSingle = !inSingle;
    if (!inSingle && ch === '"') inDouble = !inDouble;
    if (!inSingle && !inDouble && ch === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trimEnd();
    }
  }

  return text;
}

function parseYamlNode(lines: YamlLine[], index: number, indent: number): [JsonValue, number] {
  const line = lines[index];
  if (!line || line.indent < indent) return [null, index];
  if (line.indent !== indent) {
    throw new Error(`Line ${line.lineNumber}: unexpected indentation.`);
  }

  if (isSequenceLine(line.text)) return parseYamlSequence(lines, index, indent);
  if (findTopLevelColon(line.text) !== -1) return parseYamlMapping(lines, index, indent);
  return [parseYamlScalar(line.text), index + 1];
}

function parseYamlMapping(lines: YamlLine[], index: number, indent: number): [JsonObject, number] {
  const object: JsonObject = {};
  let cursor = index;

  while (cursor < lines.length && lines[cursor].indent === indent && !isSequenceLine(lines[cursor].text)) {
    const line = lines[cursor];
    const colonIndex = findTopLevelColon(line.text);
    if (colonIndex === -1) break;

    const key = parseYamlKey(line.text.slice(0, colonIndex).trim());
    const rawValue = line.text.slice(colonIndex + 1).trim();

    if (rawValue === '') {
      if (!lines[cursor + 1] || lines[cursor + 1].indent <= indent) {
        object[key] = null;
        cursor++;
      } else {
        const [child, nextIndex] = parseYamlNode(lines, cursor + 1, lines[cursor + 1].indent);
        object[key] = child;
        cursor = nextIndex;
      }
      continue;
    }

    if (rawValue === '|' || rawValue === '|-') {
      const [block, nextIndex] = parseLiteralBlock(lines, cursor + 1, indent + 2, rawValue === '|');
      object[key] = block;
      cursor = nextIndex;
      continue;
    }

    object[key] = parseYamlScalar(rawValue);
    cursor++;
  }

  return [object, cursor];
}

function parseYamlSequence(lines: YamlLine[], index: number, indent: number): [JsonArray, number] {
  const array: JsonArray = [];
  let cursor = index;

  while (cursor < lines.length && lines[cursor].indent === indent && isSequenceLine(lines[cursor].text)) {
    const line = lines[cursor];
    const rawValue = line.text === '-' ? '' : line.text.slice(2).trim();

    if (rawValue === '') {
      if (!lines[cursor + 1] || lines[cursor + 1].indent <= indent) {
        array.push(null);
        cursor++;
      } else {
        const [child, nextIndex] = parseYamlNode(lines, cursor + 1, lines[cursor + 1].indent);
        array.push(child);
        cursor = nextIndex;
      }
      continue;
    }

    const colonIndex = findTopLevelColon(rawValue);
    if (colonIndex > 0) {
      const object: JsonObject = {};
      const key = parseYamlKey(rawValue.slice(0, colonIndex).trim());
      const valueText = rawValue.slice(colonIndex + 1).trim();
      cursor++;
      if (valueText === '') {
        if (lines[cursor] && lines[cursor].indent > indent + 2) {
          const [nested, nextIndex] = parseYamlNode(lines, cursor, lines[cursor].indent);
          object[key] = nested;
          cursor = nextIndex;
        } else {
          object[key] = null;
        }
      } else {
        object[key] = parseYamlScalar(valueText);
      }

      while (cursor < lines.length && lines[cursor].indent === indent + 2 && !isSequenceLine(lines[cursor].text)) {
        const childLine = lines[cursor];
        const childColon = findTopLevelColon(childLine.text);
        if (childColon === -1) break;
        const childKey = parseYamlKey(childLine.text.slice(0, childColon).trim());
        const childValue = childLine.text.slice(childColon + 1).trim();
        if (childValue === '') {
          if (!lines[cursor + 1] || lines[cursor + 1].indent <= childLine.indent) {
            object[childKey] = null;
            cursor++;
          } else {
            const [nested, nextIndex] = parseYamlNode(lines, cursor + 1, lines[cursor + 1].indent);
            object[childKey] = nested;
            cursor = nextIndex;
          }
        } else {
          object[childKey] = parseYamlScalar(childValue);
          cursor++;
        }
      }

      array.push(object);
      continue;
    }

    array.push(parseYamlScalar(rawValue));
    cursor++;
  }

  return [array, cursor];
}

function parseLiteralBlock(lines: YamlLine[], index: number, indent: number, keepTrailingNewline: boolean): [string, number] {
  const blockLines: string[] = [];
  let cursor = index;

  while (cursor < lines.length && lines[cursor].indent >= indent) {
    blockLines.push(lines[cursor].text.padStart(lines[cursor].text.length + lines[cursor].indent - indent, ' '));
    cursor++;
  }

  return [blockLines.join('\n') + (keepTrailingNewline ? '\n' : ''), cursor];
}

function isSequenceLine(text: string): boolean {
  return text === '-' || text.startsWith('- ');
}

function findTopLevelColon(text: string): number {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inDouble && escaped) {
      escaped = false;
      continue;
    }
    if (inDouble && ch === '\\') {
      escaped = true;
      continue;
    }
    if (!inDouble && ch === "'") inSingle = !inSingle;
    if (!inSingle && ch === '"') inDouble = !inDouble;
    if (!inSingle && !inDouble && ch === ':') return i;
  }

  return -1;
}

function parseYamlKey(key: string): string {
  const parsed = parseYamlScalar(key);
  return String(parsed ?? '');
}

function parseYamlScalar(rawValue: string): JsonValue {
  const value = rawValue.trim();
  if (value === 'null' || value === '~') return null;
  if (value === 'true' || value === 'True' || value === 'TRUE') return true;
  if (value === 'false' || value === 'False' || value === 'FALSE') return false;
  if (value === '[]') return [];
  if (value === '{}') return {};
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('"') && value.endsWith('"')) return parseDoubleQuotedYaml(value);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

function parseDoubleQuotedYaml(value: string): string {
  const inner = value.slice(1, -1);
  return inner.replace(/\\([0abtnvfre"\\/])/g, (_match, escape: string) => {
    switch (escape) {
      case '0': return '\0';
      case 'a': return '\x07';
      case 'b': return '\b';
      case 't': return '\t';
      case 'n': return '\n';
      case 'v': return '\v';
      case 'f': return '\f';
      case 'r': return '\r';
      case 'e': return '\x1b';
      default: return escape;
    }
  });
}
