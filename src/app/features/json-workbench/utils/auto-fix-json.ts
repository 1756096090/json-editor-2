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
 */

// ── Public API ────────────────────────────────────────────────────────────────

export type FixLabel =
  | 'trim'
  | 'bom'
  | 'code-fence'
  | 'smart-quotes'
  | 'comments'
  | 'fix-quotes'
  | 'trailing-commas'
  | 'single-quotes'
  | 'unquoted-keys'
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
 * @param maxAttempts - Maximum number of single-step iterations (default 10).
 */
export function tryAutoFixJson(input: string, maxAttempts = 10): AutoFixResult {
  // Valid JSON needs no repair — never report it as an error.
  if (looksLikeValidJson(input)) {
    return { ok: true, fixedText: input, appliedFixes: [] };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 1: Try each single-step transform in isolation
  // ──────────────────────────────────────────────────────────────────────────
  const singleSteps: Array<{ label: FixLabel; fn: (s: string) => string }> = [
    { label: 'trim',            fn: applyTrim },
    { label: 'bom',             fn: applyBom },
    { label: 'code-fence',      fn: applyCodeFence },
    { label: 'smart-quotes',    fn: applySmartQuotes },
    { label: 'comments',        fn: applyComments },
    { label: 'fix-quotes',      fn: applyMissingQuotes },
    { label: 'trailing-commas', fn: applyTrailingCommas },
    { label: 'single-quotes',   fn: applySingleQuotes },
    { label: 'unquoted-keys',   fn: applyUnquotedKeys },
    { label: 'insert-commas',   fn: applyMissingCommas },
    { label: 'close-brackets',  fn: applyCloseBrackets },
    { label: 'extract-block',   fn: applyExtractBlock },
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
    if (!changed) break; // No progress — stop early
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
      // Copy the whole string literal verbatim
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

/**
 * Trim surrounding whitespace and normalize line endings.
 * Note: BOM (\uFEFF) is handled separately by applyBom.
 */
function applyTrim(text: string): string {
  // Normalize line endings first
  let result = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Trim whitespace but preserve BOM at the start (BOM is \uFEFF)
  result = result.replace(/^[\t\n\f\r ]+/, '').replace(/[\t\n\f\r ]+$/, '');
  return result;
}

/**
 * Strip UTF-8 BOM and zero-width / non-printable characters.
 */
function applyBom(text: string): string {
  // BOM (\uFEFF) + common zero-width Unicode chars
  // eslint-disable-next-line no-control-regex
  return text.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF\u0000]/g, '');
}

/**
 * Strip Markdown code fences (```json … ``` or ``` … ```).
 */
function applyCodeFence(text: string): string {
  const match = text.match(/^\s*```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?\s*```\s*$/);
  return match ? match[1] : text;
}

/**
 * Replace typographic ("smart") quotes with straight quotes.
 * Runs outside existing double-quoted strings so valid content is untouched.
 */
function applySmartQuotes(text: string): string {
  return transformOutsideStrings(text, (seg) =>
    seg.replace(/[“”„‟]/g, '"').replace(/[‘’‚‛]/g, "'")
  );
}

/**
 * Remove line comments and block comments.
 * String-aware: comment markers inside strings (e.g. URLs) are preserved.
 */
function applyComments(text: string): string {
  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (ch === '"') {
      // Copy string literal verbatim
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
    } else if (ch === '/' && text[i + 1] === '/') {
      // Line comment — skip to end of line
      while (i < len && text[i] !== '\n') i++;
    } else if (ch === '/' && text[i + 1] === '*') {
      // Block comment — skip to closing */
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

/**
 * Remove trailing commas before `}` or `]`.
 * String-aware: commas inside string values are never touched.
 */
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

/**
 * Quote bare object keys (`{a: 1}` → `{"a": 1}`).
 * String-aware: identifiers inside string values are never touched.
 */
function applyUnquotedKeys(text: string): string {
  return transformOutsideStrings(text, (seg) =>
    seg.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
  );
}

/**
 * Convert single-quoted string delimiters to double-quoted ones.
 * Safely handles only cases where strings are delimited by unescaped single quotes
 * and do not contain literal double quotes that would become invalid.
 *
 * Strategy: tokenize character-by-character to avoid breaking string contents.
 */
function applySingleQuotes(text: string): string {
  let result = '';
  let i = 0;
  const len = text.length;
  while (i < len) {
    const ch = text[i];
    if (ch === "'") {
      // Start of a single-quoted string — collect until the closing unescaped '
      let str = '"';
      i++;
      while (i < len) {
        const c = text[i];
        if (c === '\\' && i + 1 < len) {
          const next = text[i + 1];
          if (next === "'") {
            // Escaped single quote inside single-quoted string → just single quote in JSON
            str += "'";
            i += 2;
          } else {
            str += c + next;
            i += 2;
          }
          continue;
        }
        if (c === '"') {
          // Unescaped double quote inside single-quoted string → must escape it
          str += '\\"';
          i++;
          continue;
        }
        if (c === "'") {
          // End of string
          str += '"';
          i++;
          break;
        }
        str += c;
        i++;
      }
      result += str;
    } else if (ch === '"') {
      // Already a double-quoted string — copy verbatim, respecting escapes
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
      result += ch;
      i++;
    }
  }
  return result;
}

/**
 * Append missing closing brackets/braces using a stack.
 * Only appends — never removes or modifies existing characters.
 */
function applyCloseBrackets(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\' && i + 1 < len) {
        i += 2; // skip escape sequence
        continue;
      }
      if (ch === '"') inString = false;
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        stack.push('}');
      } else if (ch === '[') {
        stack.push(']');
      } else if (ch === '}' || ch === ']') {
        if (stack.length && stack[stack.length - 1] === ch) {
          stack.pop();
        }
      }
    }
    i++;
  }

  if (!stack.length) return text; // Already balanced
  return text + stack.reverse().join('');
}

/**
 * Extract the first complete top-level JSON object or array from surrounding noise.
 * Useful for JSON embedded in prose or with extra wrapper text.
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
      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        stack.push('}');
      } else if (ch === '[') {
        stack.push(']');
      } else if (ch === '}' || ch === ']') {
        if (stack[stack.length - 1] === ch) stack.pop();
      }
    }
    i++;
  }

  if (stack.length) return text; // Could not balance
  const extracted = text.slice(first, i);
  return extracted === text ? text : extracted;
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
    // inside a string
    if (ch === '\\' && i + 1 < len) {
      result += ch + text[i + 1];
      i += 2;
      continue;
    }
    if (ch === '"') {
      result += ch;
      inString = false;
      i++;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      // Unterminated at end of line → close the string before the newline
      result += '"';
      inString = false;
      continue; // re-process the newline outside the string
    }
    result += ch;
    i++;
  }

  if (inString) result += '"'; // Unterminated at end of input
  return result;
}

// ── Missing-comma insertion (token-driven) ──────────────────────────────────

type JsonTokenType = 'str' | 'num' | '{' | '}' | '[' | ']' | ':' | ',';
interface JsonToken {
  type: JsonTokenType;
  start: number;
}

/**
 * Insert commas that are missing between consecutive values in arrays and
 * between key/value pairs in objects (e.g. `{"a":1 "b":2}` or `[1 2 3]`).
 * Operates on a token stream so string contents are never touched.
 */
function applyMissingCommas(text: string): string {
  const tokens = tokenizeJson(text);
  if (!tokens) return text; // Unterminated string — let fix-quotes handle it first

  const inserts: number[] = [];
  let i = 0;

  const isValueStart = (t: JsonToken | undefined): boolean =>
    !!t && (t.type === 'str' || t.type === 'num' || t.type === '{' || t.type === '[');

  const parseValue = (): void => {
    const t = tokens[i];
    if (!t) return;
    if (t.type === '{') { parseObject(); return; }
    if (t.type === '[') { parseArray(); return; }
    if (t.type === 'str' || t.type === 'num') { i++; }
    // structural token where a value was expected → leave for the caller
  };

  const parseObject = (): void => {
    i++; // consume '{'
    while (i < tokens.length && tokens[i].type !== '}') {
      const before = i;
      if (tokens[i].type === 'str') i++; else break; // key
      if (tokens[i] && tokens[i].type === ':') i++; else break;
      parseValue();
      if (tokens[i] && tokens[i].type === ',') { i++; continue; }
      if (!tokens[i] || tokens[i].type === '}') break;
      if (isValueStart(tokens[i])) { inserts.push(tokens[i].start); continue; }
      if (i === before) break; // no progress — avoid infinite loop
    }
    if (tokens[i] && tokens[i].type === '}') i++;
  };

  const parseArray = (): void => {
    i++; // consume '['
    while (i < tokens.length && tokens[i].type !== ']') {
      const before = i;
      parseValue();
      if (tokens[i] && tokens[i].type === ',') { i++; continue; }
      if (!tokens[i] || tokens[i].type === ']') break;
      if (isValueStart(tokens[i])) { inserts.push(tokens[i].start); continue; }
      if (i === before) break; // no progress — avoid infinite loop
    }
    if (tokens[i] && tokens[i].type === ']') i++;
  };

  parseValue();

  if (inserts.length === 0) return text;

  // Insert from the end so earlier offsets stay valid.
  let result = text;
  for (const pos of inserts.sort((a, b) => b - a)) {
    result = result.slice(0, pos) + ',' + result.slice(pos);
  }
  return result;
}

/** Tokenize JSON-ish text. Returns null if a string literal is unterminated. */
function tokenizeJson(text: string): JsonToken[] | null {
  const tokens: JsonToken[] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }
    if (ch === '{' || ch === '}' || ch === '[' || ch === ']' || ch === ':' || ch === ',') {
      tokens.push({ type: ch as JsonTokenType, start: i });
      i++;
      continue;
    }
    if (ch === '"') {
      const start = i;
      i++;
      let closed = false;
      while (i < len) {
        const c = text[i];
        if (c === '\\' && i + 1 < len) { i += 2; continue; }
        if (c === '"') { i++; closed = true; break; }
        if (c === '\n' || c === '\r') break; // unterminated
        i++;
      }
      if (!closed) return null;
      tokens.push({ type: 'str', start });
      continue;
    }
    // number / true / false / null — read until a delimiter
    const start = i;
    while (i < len && ' \t\n\r{}[]:,"'.indexOf(text[i]) === -1) i++;
    if (i === start) { i++; continue; } // stray char
    tokens.push({ type: 'num', start });
  }

  return tokens;
}
