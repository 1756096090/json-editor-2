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
  | 'trailing-commas'
  | 'single-quotes'
  | 'unquoted-keys'
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
    { label: 'trailing-commas', fn: applyTrailingCommas },
    { label: 'single-quotes',   fn: applySingleQuotes },
    { label: 'unquoted-keys',   fn: applyUnquotedKeys },
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
