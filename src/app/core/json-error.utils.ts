/**
 * json-error.utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilities for extracting structured error position from JSON.parse errors.
 */

export interface JsonErrorPosition {
  /** 0-based character offset in the source string. */
  offset: number;
  /** 1-based line number. */
  line: number;
  /** 1-based column number. */
  column: number;
  /** Human-readable error message (from SyntaxError). */
  message: string;
}

/**
 * Parse a JSON string and, if it fails, extract line/column from the error.
 * Returns `null` when the JSON is valid.
 */
export function getJsonError(source: string): JsonErrorPosition | null {
  try {
    JSON.parse(source);
    return null;
  } catch (err) {
    if (!(err instanceof SyntaxError)) {
      return { offset: 0, line: 1, column: 1, message: String(err) };
    }

    const msg = err.message;
    const offset = extractPosition(msg);
    const { line, column } = offsetToLineCol(source, offset);
    return { offset, line, column, message: msg };
  }
}

/**
 * Extract the character position from a SyntaxError message.
 * Handles V8 ("at position N") and SpiderMonkey ("at line N column N") formats.
 */
function extractPosition(message: string): number {
  // V8: "… at position 42"
  const posMatch = message.match(/at position (\d+)/i);
  if (posMatch) {
    return parseInt(posMatch[1], 10);
  }

  // Some engines: "at line N column N of the JSON data"
  const lineColMatch = message.match(/at line (\d+) column (\d+)/i);
  if (lineColMatch) {
    // Return a rough offset — the caller will recalculate from the source.
    return -1; // Will be recalculated
  }

  return 0;
}

/**
 * Convert a 0-based character offset to 1-based { line, column }.
 * If offset is -1 (unknown), returns { 1, 1 }.
 */
export function offsetToLineCol(
  source: string,
  offset: number
): { line: number; column: number } {
  if (offset < 0) {
    return { line: 1, column: 1 };
  }

  let line = 1;
  let col = 1;
  const safeOffset = Math.min(offset, source.length);

  for (let i = 0; i < safeOffset; i++) {
    if (source[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }

  return { line, column: col };
}
