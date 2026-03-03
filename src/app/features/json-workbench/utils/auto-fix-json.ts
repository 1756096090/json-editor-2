/**
 * auto-fix-json.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Heuristic pipeline that attempts to repair common JSON authoring mistakes.
 * Each step is tried in sequence; the first successful parse wins.
 * The whole pipeline can also be combined for multi-step fixes.
 */

// ── Public API ────────────────────────────────────────────────────────────────

export type FixLabel =
  | 'trim'
  | 'bom'
  | 'trailing-commas'
  | 'single-quotes'
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
 * Returns `AutoFixSuccess` with the corrected text and applied fixes,
 * or `AutoFixFailure` if no fix was found.
 *
 * @param input - The raw text to fix.
 * @param maxAttempts - Maximum number of single-step iterations (default 10).
 */
export function tryAutoFixJson(input: string, maxAttempts = 10): AutoFixResult {
  // If it already parses → nothing to do (caller should not call us, but just in case)
  if (looksLikeValidJson(input)) {
    return { ok: false, reason: 'Input is already valid JSON.' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 1: Try each single-step transform in isolation
  // ──────────────────────────────────────────────────────────────────────────
  const singleSteps: Array<{ label: FixLabel; fn: (s: string) => string }> = [
    { label: 'trim',            fn: applyTrim },
    { label: 'bom',             fn: applyBom },
    { label: 'trailing-commas', fn: applyTrailingCommas },
    { label: 'single-quotes',   fn: applySingleQuotes },
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
  const pipeline: Array<(s: string) => string> = [
    applyTrim,
    applyBom,
    applyTrailingCommas,
    applySingleQuotes,
    applyCloseBrackets,
    applyExtractBlock,
  ];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let changed = false;
    for (const fn of pipeline) {
      const next = fn(text);
      if (next !== text) {
        text = next;
        changed = true;
        if (looksLikeValidJson(text)) {
          return { ok: true, fixedText: text, appliedFixes: ['combined'] };
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

// ── Transforms ────────────────────────────────────────────────────────────────

/**
 * Trim surrounding whitespace and normalize line endings.
 */
function applyTrim(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
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
 * Remove trailing commas before `}` or `]`.
 * Handles single and multiple trailing commas, and whitespace/newlines between them.
 */
function applyTrailingCommas(text: string): string {
  // Loop to handle consecutive trailing commas
  let prev = '';
  let result = text;
  while (prev !== result) {
    prev = result;
    result = result.replace(/,(\s*[}\]])/g, '$1');
  }
  return result;
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
      let hasIssue = false;
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
      if (hasIssue) return text; // Bail out if something looked wrong
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
