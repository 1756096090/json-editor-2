/**
 * auto-fix-json.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Heuristic pipeline that attempts to repair common JSON authoring mistakes.
 * Each step is tried in sequence; the first successful parse wins.
 * The whole pipeline can also be combined for multi-step fixes.
 *
 * All transforms that could touch string contents are string-aware: they
 * tokenize the input and never modify characters inside double-quoted strings
 * (so URLs like "https://api.com/a//b" survive comment stripping).
 *
 * Fixes handled:
 *  - Whitespace / BOM / code-fence cleanup
 *  - Typographic ("smart") quotes
 *  - Line and block comments (JSONC)
 *  - Python literals: True → true, False → false, None → null
 *  - JS undefined → null, NaN → null, Infinity → null
 *  - Control characters inside strings (\t, \b, \f, U+0000–U+001F)
 *  - Unterminated strings (closed at raw newline or end-of-input)
 *  - Trailing commas before } or ]
 *  - Single-quoted string delimiters
 *  - Unquoted object keys (identifiers and numeric)
 *  - Special numeric literals: hex, octal, binary, leading/trailing dot
 *  - Missing commas between values (token-driven, truncation-tolerant)
 *  - Missing closing brackets (with truncated-string awareness)
 *  - JSON block extraction from surrounding prose
 */

// ── Public API ────────────────────────────────────────────────────────────────

export type FixLabel =
  | 'trim'
  | 'bom'
  | 'code-fence'
  | 'smart-quotes'
  | 'comments'
  | 'python-literals'
  | 'undefined-null'
  | 'control-chars'
  | 'fix-quotes'
  | 'trailing-commas'
  | 'single-quotes'
  | 'unquoted-keys'
  | 'numeric-literals'
  | 'insert-commas'
  | 'close-brackets'
  | 'extract-block'
  | 'combined';

export interface AutoFixSuccess {
  ok: true;
  fixedText: string;
  appliedFixes: FixLabel[];
}

export interface AutoFixFailure {
  ok: false;
  reason: string;
}

export type AutoFixResult = AutoFixSuccess | AutoFixFailure;

/**
 * Attempt to fix `input` using a heuristic pipeline.
 * If the input is already valid JSON it is returned unchanged with no fixes.
 * Returns `AutoFixSuccess` with the corrected text and applied fixes,
 * or `AutoFixFailure` if no fix was found.
 *
 * @param input - The raw text to fix.
 * @param maxAttempts - Maximum number of chaining iterations (default 10).
 */
export function tryAutoFixJson(input: string, maxAttempts = 10): AutoFixResult {
  if (looksLikeValidJson(input)) {
    return { ok: true, fixedText: input, appliedFixes: [] };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 1: Try each single-step transform in isolation
  // ──────────────────────────────────────────────────────────────────────────
  const singleSteps: Array<{ label: FixLabel; fn: (s: string) => string }> = [
    { label: 'trim',             fn: applyTrim },
    { label: 'bom',              fn: applyBom },
    { label: 'code-fence',       fn: applyCodeFence },
    { label: 'smart-quotes',     fn: applySmartQuotes },
    { label: 'comments',         fn: applyComments },
    { label: 'python-literals',  fn: applyPythonLiterals },
    { label: 'undefined-null',   fn: applyUndefined },
    { label: 'control-chars',    fn: applyControlChars },
    { label: 'fix-quotes',       fn: applyMissingQuotes },
    { label: 'trailing-commas',  fn: applyTrailingCommas },
    { label: 'single-quotes',    fn: applySingleQuotes },
    { label: 'unquoted-keys',    fn: applyUnquotedKeys },
    { label: 'numeric-literals', fn: applyNumericLiterals },
    { label: 'insert-commas',    fn: applyMissingCommas },
    { label: 'close-brackets',   fn: applyCloseBrackets },
    { label: 'extract-block',    fn: applyExtractBlock },
  ];

  for (const step of singleSteps) {
    const candidate = step.fn(input);
    if (candidate !== input && looksLikeValidJson(candidate)) {
      return { ok: true, fixedText: candidate, appliedFixes: [step.label] };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 2: Chain all transforms iteratively (up to maxAttempts passes)
  // ──────────────────────────────────────────────────────────────────────────
  let text = input;
  const appliedLabels = new Set<FixLabel>();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let changed = false;
    for (const step of singleSteps) {
      const next = step.fn(text);
      if (next !== text) {
        text = next;
        changed = true;
        appliedLabels.add(step.label);
        if (looksLikeValidJson(text)) {
          const labels = [...appliedLabels];
          return {
            ok: true,
            fixedText: text,
            appliedFixes: labels.length > 1 ? ['combined'] : labels,
          };
        }
      }
    }
    if (!changed) break;
  }

  return { ok: false, reason: 'No se pudo reparar el JSON automáticamente.' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function looksLikeValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Apply `fn` only to the segments of `text` that are OUTSIDE double-quoted
 * strings. String contents (including escapes) are copied verbatim, so
 * transforms can never corrupt values like URLs or embedded symbols.
 */
function transformOutsideStrings(text: string, fn: (segment: string) => string): string {
  let result = '';
  let segment = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (ch === '"') {
      result += fn(segment);
      segment = '';
      result += ch;
      i++;
      while (i < len) {
        const c = text[i];
        if (c === '\\' && i + 1 < len) {
          result += c + text[i + 1];
          i += 2;
          continue;
        }
        result += c;
        i++;
        if (c === '"') break;
      }
    } else {
      segment += ch;
      i++;
    }
  }
  return result + fn(segment);
}

// ── Transforms ────────────────────────────────────────────────────────────────

function applyTrim(text: string): string {
  let result = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  result = result.replace(/^[\t\n\f\r ]+/, '').replace(/[\t\n\f\r ]+$/, '');
  return result;
}

function applyBom(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF\u0000]/g, '');
}

function applyCodeFence(text: string): string {
  const match = text.match(/^\s*```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?\s*```\s*$/);
  return match ? match[1] : text;
}

function applySmartQuotes(text: string): string {
  return transformOutsideStrings(text, (seg) =>
    seg.replace(/[\u201C\u201D\u201E\u201F]/g, '"').replace(/[\u2018\u2019\u201A\u201B]/g, "'")
  );
}

/** Strip line and block comments (JSONC). String-aware — URLs inside strings are preserved. */
function applyComments(text: string): string {
  let result = '';
  let i = 0;
  const len = text.length;
  while (i < len) {
    const ch = text[i];
    if (ch === '"') {
      result += ch;
      i++;
      while (i < len) {
        const c = text[i];
        if (c === '\\' && i + 1 < len) { result += c + text[i + 1]; i += 2; continue; }
        result += c;
        i++;
        if (c === '"') break;
      }
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < len && text[i] !== '\n') i++;
    } else if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < len && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}

/** Python/Ruby literals outside strings: True→true, False→false, None→null. */
function applyPythonLiterals(text: string): string {
  return transformOutsideStrings(text, (seg) =>
    seg
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null')
  );
}

/** JavaScript non-JSON values outside strings: undefined→null. */
function applyUndefined(text: string): string {
  return transformOutsideStrings(text, (seg) =>
    seg.replace(/\bundefined\b/g, 'null')
  );
}

/**
 * Escape control characters (U+0000–U+001F) found inside double-quoted strings.
 * Raw \n and \r are excluded here — they signal unterminated strings and are
 * handled by applyMissingQuotes so the string can be closed at the right boundary.
 */
function applyControlChars(text: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  const len = text.length;
  while (i < len) {
    const ch = text[i];
    if (!inString) {
      result += ch;
      if (ch === '"') inString = true;
      i++;
    } else {
      if (ch === '\\' && i + 1 < len) { result += ch + text[i + 1]; i += 2; continue; }
      if (ch === '"') { result += ch; inString = false; i++; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20 && ch !== '\n' && ch !== '\r') {
        const named: Record<string, string> = { '\t': '\\t', '\b': '\\b', '\f': '\\f' };
        result += named[ch] ?? '\\u' + code.toString(16).padStart(4, '0');
      } else {
        result += ch;
      }
      i++;
    }
  }
  return result;
}

/**
 * Close an unterminated string by inserting the missing `"`.
 * A raw newline or end-of-input reached while inside a string means the closing
 * quote was dropped — JSON strings cannot span raw newlines, so this only ever
 * fires on already-broken input.
 */
function applyMissingQuotes(text: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (!inString) {
      result += ch;
      if (ch === '"') inString = true;
      i++;
      continue;
    }
    if (ch === '\\' && i + 1 < len) { result += ch + text[i + 1]; i += 2; continue; }
    if (ch === '"') { result += ch; inString = false; i++; continue; }
    if (ch === '\n' || ch === '\r') {
      result += '"';
      inString = false;
      continue; // re-process the newline outside the string
    }
    result += ch;
    i++;
  }

  if (inString) result += '"';
  return result;
}

/** Remove trailing commas before `}` or `]`. String-aware. */
function applyTrailingCommas(text: string): string {
  return transformOutsideStrings(text, (seg) => {
    let prev = '';
    let result = seg;
    while (prev !== result) {
      prev = result;
      result = result.replace(/,(\s*[}\]])/g, '$1');
    }
    return result;
  });
}

/** Convert single-quoted string delimiters to double-quoted ones. */
function applySingleQuotes(text: string): string {
  let result = '';
  let i = 0;
  const len = text.length;
  while (i < len) {
    const ch = text[i];
    if (ch === "'") {
      let str = '"';
      i++;
      while (i < len) {
        const c = text[i];
        if (c === '\\' && i + 1 < len) {
          const next = text[i + 1];
          str += next === "'" ? "'" : c + next;
          i += 2;
          continue;
        }
        if (c === '"') { str += '\\"'; i++; continue; }
        if (c === "'") { str += '"'; i++; break; }
        str += c;
        i++;
      }
      result += str;
    } else if (ch === '"') {
      result += ch;
      i++;
      while (i < len) {
        const c = text[i];
        if (c === '\\' && i + 1 < len) { result += c + text[i + 1]; i += 2; continue; }
        result += c;
        i++;
        if (c === '"') break;
      }
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}

/**
 * Quote bare object keys including numeric keys.
 * {a: 1} → {"a": 1},  {0: "x"} → {"0": "x"}
 */
function applyUnquotedKeys(text: string): string {
  return transformOutsideStrings(text, (seg) =>
    seg
      .replace(/([{,]\s*)([A-Za-z_$][\w$.]*)(\s*:)/g, '$1"$2"$3')
      .replace(/([{,]\s*)(\d+)(\s*:)/g, '$1"$2"$3')
  );
}

/**
 * Replace special numeric literals that JSON does not support:
 *  - NaN, Infinity, -Infinity → null
 *  - Hex (0xFF), octal (0o17), binary (0b10) → decimal integer
 *  - Leading decimal point: .5 → 0.5
 *  - Trailing decimal point: 1. → 1
 */
function applyNumericLiterals(text: string): string {
  return transformOutsideStrings(text, (seg) =>
    seg
      .replace(/\bNaN\b/g, 'null')
      .replace(/\bInfinity\b/g, 'null')
      .replace(/-Infinity\b/g, 'null')
      .replace(/\b0[xX]([0-9a-fA-F]+)\b/g, (_, h) => String(parseInt(h, 16)))
      .replace(/\b0[oO]([0-7]+)\b/g, (_, o) => String(parseInt(o, 8)))
      .replace(/\b0[bB]([01]+)\b/g, (_, b) => String(parseInt(b, 2)))
      // Leading dot: .5 → 0.5  (callback avoids $10/$2 group-index ambiguity)
      .replace(/(^|[\s,\[{:])(\.\d+)/g, (_, pre, dot) => pre + '0' + dot)
      // Trailing dot: 1. → 1  (lookahead keeps the delimiter in place)
      .replace(/(\d+)\.(?=[\s,\]\}\n]|$)/g, '$1')
  );
}

/**
 * Append missing closing brackets/braces and close any unterminated string
 * that would prevent the brackets from being meaningful.
 */
function applyCloseBrackets(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\' && i + 1 < len) { i += 2; continue; }
      if (ch === '"') inString = false;
    } else {
      if (ch === '"') { inString = true; }
      else if (ch === '{') { stack.push('}'); }
      else if (ch === '[') { stack.push(']'); }
      else if (ch === '}' || ch === ']') {
        if (stack.length && stack[stack.length - 1] === ch) stack.pop();
      }
    }
    i++;
  }

  const closeStr = inString ? '"' : '';
  if (!closeStr && !stack.length) return text;
  return text + closeStr + stack.reverse().join('');
}

/**
 * Extract the first complete top-level JSON object or array from surrounding noise.
 */
function applyExtractBlock(text: string): string {
  const first = text.search(/[{[]/);
  if (first === -1) return text;

  const opener = text[first];
  const closer = opener === '{' ? '}' : ']';
  const stack: string[] = [closer];
  let inString = false;
  let i = first + 1;

  while (i < text.length && stack.length) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\' && i + 1 < text.length) { i += 2; continue; }
      if (ch === '"') inString = false;
    } else {
      if (ch === '"') { inString = true; }
      else if (ch === '{') { stack.push('}'); }
      else if (ch === '[') { stack.push(']'); }
      else if ((ch === '}' || ch === ']') && stack[stack.length - 1] === ch) { stack.pop(); }
    }
    i++;
  }

  if (stack.length) return text;
  const extracted = text.slice(first, i);
  return extracted === text ? text : extracted;
}

// ── Missing-comma insertion (token-driven) ────────────────────────────────────

type JsonTokenType = 'str' | 'num' | '{' | '}' | '[' | ']' | ':' | ',';
interface JsonToken { type: JsonTokenType; start: number; }

/**
 * Tokenize JSON-ish text into a flat token list.
 * Unterminated strings are treated as closed at the first raw newline or
 * end-of-input, allowing comma insertion to work on truncated documents.
 */
function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }
    if ('{}[]:,'.includes(ch)) {
      tokens.push({ type: ch as JsonTokenType, start: i });
      i++;
      continue;
    }
    if (ch === '"') {
      const start = i++;
      while (i < len) {
        const c = text[i];
        if (c === '\\' && i + 1 < len) { i += 2; continue; }
        if (c === '\n' || c === '\r') break; // treat newline as implicit close
        if (c === '"') { i++; break; }
        i++;
      }
      tokens.push({ type: 'str', start });
      continue;
    }
    const start = i;
    while (i < len && !' \t\n\r{}[]:,"'.includes(text[i])) i++;
    if (i > start) tokens.push({ type: 'num', start });
    else i++;
  }

  return tokens;
}

/**
 * Insert commas that are missing between consecutive values in arrays and
 * between key/value pairs in objects (e.g. `{"a":1 "b":2}` or `[1 2 3]`).
 * Operates on a token stream so string contents are never touched.
 * Tolerates truncated input thanks to the updated tokenizer.
 */
function applyMissingCommas(text: string): string {
  const tokens = tokenizeJson(text);
  const inserts: number[] = [];
  let i = 0;

  const isValueStart = (t: JsonToken | undefined): boolean =>
    !!t && (t.type === 'str' || t.type === 'num' || t.type === '{' || t.type === '[');

  const parseValue = (): void => {
    const t = tokens[i];
    if (!t) return;
    if (t.type === '{') { parseObject(); return; }
    if (t.type === '[') { parseArray(); return; }
    if (t.type === 'str' || t.type === 'num') i++;
  };

  const parseObject = (): void => {
    i++; // consume '{'
    while (i < tokens.length && tokens[i].type !== '}') {
      const before = i;
      if (tokens[i].type === 'str') i++; else break;
      if (tokens[i]?.type === ':') i++; else break;
      parseValue();
      if (tokens[i]?.type === ',') { i++; continue; }
      if (!tokens[i] || tokens[i].type === '}') break;
      if (isValueStart(tokens[i])) { inserts.push(tokens[i].start); continue; }
      if (i === before) break;
    }
    if (tokens[i]?.type === '}') i++;
  };

  const parseArray = (): void => {
    i++; // consume '['
    while (i < tokens.length && tokens[i].type !== ']') {
      const before = i;
      parseValue();
      if (tokens[i]?.type === ',') { i++; continue; }
      if (!tokens[i] || tokens[i].type === ']') break;
      if (isValueStart(tokens[i])) { inserts.push(tokens[i].start); continue; }
      if (i === before) break;
    }
    if (tokens[i]?.type === ']') i++;
  };

  parseValue();

  if (inserts.length === 0) return text;

  let result = text;
  for (const pos of inserts.sort((a, b) => b - a)) {
    result = result.slice(0, pos) + ',' + result.slice(pos);
  }
  return result;
}