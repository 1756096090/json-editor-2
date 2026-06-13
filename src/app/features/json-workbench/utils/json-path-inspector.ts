/**
 * json-path-inspector.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps a character offset inside a JSON document to the access path of the
 * value under the cursor, and renders that path for several languages.
 * Single O(n) scan, no external dependencies.
 */

export type JsonPathSegment = string | number;

interface InspectContext {
  text: string;
  pos: number;
  offset: number;
  stack: JsonPathSegment[];
  result: JsonPathSegment[] | null;
}

/**
 * Return the JSON path of the value located at `offset` in `text`,
 * or null when the text is not valid JSON or the offset is out of range.
 * Array indices are returned as numbers, object keys as strings.
 */
export function getJsonPathAtOffset(text: string, offset: number): JsonPathSegment[] | null {
  if (offset < 0 || offset > text.length) return null;
  try {
    JSON.parse(text);
  } catch {
    return null;
  }

  const ctx: InspectContext = { text, pos: 0, offset, stack: [], result: null };
  parseValue(ctx);
  return ctx.result;
}

// ── Path formatters ──────────────────────────────────────────────────────────

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Visual dot notation: `usuarios.usuario.nombre`, arrays as `usuarios.0.nombre`. */
export function formatPathDots(path: JsonPathSegment[]): string {
  return path.map(String).join('.');
}

/** JavaScript access: `data.usuarios[0].nombre` (bracket syntax for exotic keys). */
export function formatPathJs(path: JsonPathSegment[], root = 'data'): string {
  return path.reduce<string>((acc, seg) => {
    if (typeof seg === 'number') return `${acc}[${seg}]`;
    if (IDENTIFIER_RE.test(seg)) return `${acc}.${seg}`;
    return `${acc}[${JSON.stringify(seg)}]`;
  }, root);
}

/** Optional-chaining JavaScript access: `data?.usuarios?.[0]?.nombre`. */
export function formatPathJsSafe(path: JsonPathSegment[], root = 'data'): string {
  return path.reduce<string>((acc, seg) => {
    if (typeof seg === 'number') return `${acc}?.[${seg}]`;
    if (IDENTIFIER_RE.test(seg)) return `${acc}?.${seg}`;
    return `${acc}?.[${JSON.stringify(seg)}]`;
  }, root);
}

/** Python access: `data["usuarios"][0]["nombre"]`. */
export function formatPathPython(path: JsonPathSegment[], root = 'data'): string {
  return path.reduce<string>((acc, seg) => {
    if (typeof seg === 'number') return `${acc}[${seg}]`;
    return `${acc}[${JSON.stringify(seg)}]`;
  }, root);
}

/** Java access: `data.get("usuarios").get(0).get("nombre")`. */
export function formatPathJava(path: JsonPathSegment[], root = 'data'): string {
  return path.reduce<string>((acc, seg) => {
    if (typeof seg === 'number') return `${acc}.get(${seg})`;
    return `${acc}.get(${JSON.stringify(seg)})`;
  }, root);
}

// ── Offset-tracking parser (assumes valid JSON) ──────────────────────────────

const WHITESPACE = ' \t\n\r';

function skipWhitespace(ctx: InspectContext): void {
  while (ctx.pos < ctx.text.length && WHITESPACE.includes(ctx.text[ctx.pos])) ctx.pos++;
}

function parseValue(ctx: InspectContext): void {
  skipWhitespace(ctx);
  const start = ctx.pos;
  const ch = ctx.text[ctx.pos];

  if (ch === '{') {
    parseObject(ctx, start);
  } else if (ch === '[') {
    parseArray(ctx, start);
  } else if (ch === '"') {
    readString(ctx);
    markIfContains(ctx, start);
  } else {
    // number / true / false / null
    while (ctx.pos < ctx.text.length && !',}]'.includes(ctx.text[ctx.pos]) && !WHITESPACE.includes(ctx.text[ctx.pos])) {
      ctx.pos++;
    }
    markIfContains(ctx, start);
  }
}

function parseObject(ctx: InspectContext, start: number): void {
  ctx.pos++; // consume '{'
  skipWhitespace(ctx);
  if (ctx.text[ctx.pos] === '}') {
    ctx.pos++;
    markIfContains(ctx, start);
    return;
  }

  for (;;) {
    skipWhitespace(ctx);
    const keyStart = ctx.pos;
    const key = readString(ctx);
    // Cursor on the key itself → path includes that key
    if (ctx.result === null && ctx.offset >= keyStart && ctx.offset <= ctx.pos) {
      ctx.result = [...ctx.stack, key];
    }
    skipWhitespace(ctx);
    ctx.pos++; // consume ':'

    ctx.stack.push(key);
    parseValue(ctx);
    ctx.stack.pop();

    skipWhitespace(ctx);
    if (ctx.text[ctx.pos] === ',') {
      ctx.pos++;
      continue;
    }
    if (ctx.text[ctx.pos] === '}') {
      ctx.pos++;
    }
    break;
  }
  markIfContains(ctx, start);
}

function parseArray(ctx: InspectContext, start: number): void {
  ctx.pos++; // consume '['
  skipWhitespace(ctx);
  if (ctx.text[ctx.pos] === ']') {
    ctx.pos++;
    markIfContains(ctx, start);
    return;
  }

  let index = 0;
  for (;;) {
    ctx.stack.push(index);
    parseValue(ctx);
    ctx.stack.pop();
    index++;

    skipWhitespace(ctx);
    if (ctx.text[ctx.pos] === ',') {
      ctx.pos++;
      continue;
    }
    if (ctx.text[ctx.pos] === ']') {
      ctx.pos++;
    }
    break;
  }
  markIfContains(ctx, start);
}

/** Reads a string literal starting at ctx.pos (must be '"') and returns its value. */
function readString(ctx: InspectContext): string {
  const strStart = ctx.pos;
  ctx.pos++; // consume opening quote
  while (ctx.pos < ctx.text.length) {
    const ch = ctx.text[ctx.pos];
    if (ch === '\\') {
      ctx.pos += 2;
      continue;
    }
    ctx.pos++;
    if (ch === '"') break;
  }
  return JSON.parse(ctx.text.slice(strStart, ctx.pos)) as string;
}

/** Record the current stack as result if the offset falls inside [start, pos]. */
function markIfContains(ctx: InspectContext, start: number): void {
  if (ctx.result === null && ctx.offset >= start && ctx.offset <= ctx.pos) {
    ctx.result = [...ctx.stack];
  }
}
