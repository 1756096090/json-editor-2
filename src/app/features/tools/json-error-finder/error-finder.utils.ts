/**
 * error-finder.utils.ts
 * Comprehensive JSON error analysis and location reporting
 */

import type { TranslationKey } from '../../../core/i18n/en';

type TextParams = Record<string, string | number>;

export interface JsonErrorInfo {
  line: number;
  column: number;
  charIndex: number;
  errorType: string;
  /** English text; `messageKey` (when set) translates it. Parser messages have no key. */
  message: string;
  messageKey?: TranslationKey;
  context: string; // surrounding code snippet
  suggestion: string;
  suggestionKey: TranslationKey;
  suggestionParams?: TextParams;
  severity: 'error' | 'warning';
}

export interface ErrorFinderResult {
  isValid: boolean;
  errors: JsonErrorInfo[];
  summary: string;
  summaryKey: TranslationKey;
  summaryParams?: TextParams;
}

/**
 * Find all JSON errors with precise line/column information
 */
export function findJsonErrors(input: string): ErrorFinderResult {
  const errors: JsonErrorInfo[] = [];
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      isValid: false,
      errors: [{
        line: 1,
        column: 1,
        charIndex: 0,
        errorType: 'EMPTY',
        message: 'JSON input is empty',
        messageKey: 'errfind.empty.msg',
        context: '',
        suggestion: 'Paste valid JSON to analyze',
        suggestionKey: 'errfind.empty.fix',
        severity: 'error'
      }],
      summary: '1 error found: Empty input',
      summaryKey: 'errfind.summary.empty'
    };
  }

  // Try standard JSON.parse first
  try {
    JSON.parse(trimmed);
    return {
      isValid: true,
      errors: [],
      summary: 'Valid JSON ✓',
      summaryKey: 'errfind.summary.valid'
    };
  } catch (e) {
    const error = e as SyntaxError;
    const match = error.message.match(/position (\d+)/);
    const position = match ? parseInt(match[1], 10) : 0;

    // Convert position to line:column
    const lineCol = positionToLineColumn(trimmed, position);
    const context = extractContext(trimmed, position);

    const errorInfo: JsonErrorInfo = {
      line: lineCol.line,
      column: lineCol.column,
      charIndex: position,
      errorType: categorizeError(trimmed, position, error.message),
      message: error.message,
      context,
      ...suggestFix(trimmed, position, error.message),
      severity: 'error'
    };

    errors.push(errorInfo);
  }

  // Additional linting checks (warnings)
  const warnings = performJsonLinting(trimmed);
  errors.push(...warnings);

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  const summary = `${errorCount} error(s), ${warningCount} warning(s)`;

  return {
    isValid: errorCount === 0,
    errors,
    summary,
    summaryKey: 'errfind.summary.counts',
    summaryParams: { errors: errorCount, warnings: warningCount }
  };
}

/**
 * Convert character position to line:column
 */
function positionToLineColumn(text: string, position: number): { line: number; column: number } {
  let line = 1;
  let column = 1;

  for (let i = 0; i < Math.min(position, text.length); i++) {
    if (text[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  return { line, column };
}

/**
 * Extract surrounding context for error
 */
function extractContext(text: string, position: number): string {
  const start = Math.max(0, position - 20);
  const end = Math.min(text.length, position + 20);
  const before = text.substring(start, position);
  const after = text.substring(position, end);
  return `...${before}⚠️${after}...`;
}

/**
 * Categorize the type of JSON error
 */
function categorizeError(text: string, position: number, message: string): string {
  const char = text[position] || 'EOF';

  if (message.includes('Unexpected token')) {
    if (char === ',') return 'TRAILING_COMMA';
    if (char === ':') return 'UNEXPECTED_COLON';
    if (char === '}' || char === ']') return 'UNEXPECTED_CLOSING_BRACKET';
    if (char === '"') return 'UNEXPECTED_STRING';
    return 'UNEXPECTED_TOKEN';
  }

  if (message.includes('Unexpected end')) return 'UNEXPECTED_EOF';
  if (message.includes('Unexpected number')) return 'INVALID_NUMBER';
  if (message.includes('Unexpected string')) return 'INVALID_STRING';

  return 'UNKNOWN_ERROR';
}

/**
 * Suggest fixes for common errors
 */
function suggestFix(
  text: string,
  position: number,
  message: string
): Pick<JsonErrorInfo, 'suggestion' | 'suggestionKey' | 'suggestionParams'> {
  const char = text[position] || 'EOF';

  if (message.includes('Trailing comma')) {
    return { suggestion: 'Remove the comma before the closing bracket/brace', suggestionKey: 'errfind.fix.trailingComma' };
  }

  if (char === ',') {
    return { suggestion: 'Unexpected comma. Check for: trailing commas, missing values, or syntax errors nearby', suggestionKey: 'errfind.fix.comma' };
  }

  if (message.includes('Unexpected end of JSON input')) {
    return { suggestion: 'JSON is incomplete. Check for: unclosed braces, brackets, or strings', suggestionKey: 'errfind.fix.incomplete' };
  }

  if (char === undefined && message.includes('Unexpected end')) {
    return { suggestion: 'JSON ends prematurely. Add closing brackets: ] or }', suggestionKey: 'errfind.fix.premature' };
  }

  if (message.includes('Unexpected token')) {
    return {
      suggestion: `Unexpected character: '${char}'. Check JSON syntax around this position`,
      suggestionKey: 'errfind.fix.unexpectedChar',
      suggestionParams: { char },
    };
  }

  return { suggestion: 'Check the JSON syntax at the error position. Ensure all brackets, braces, and quotes are properly paired.', suggestionKey: 'errfind.fix.generic' };
}

/**
 * Perform linting checks (warnings, not errors)
 */
function performJsonLinting(text: string): JsonErrorInfo[] {
  const warnings: JsonErrorInfo[] = [];

  // Check for very large numbers that might lose precision
  const numberMatches = text.match(/:\s*(\d{16,})/g);
  if (numberMatches) {
    numberMatches.forEach(match => {
      const pos = text.indexOf(match);
      const lineCol = positionToLineColumn(text, pos);
      warnings.push({
        line: lineCol.line,
        column: lineCol.column,
        charIndex: pos,
        errorType: 'LARGE_NUMBER',
        message: 'Very large number that may lose precision in JavaScript',
        messageKey: 'errfind.largeNumber.msg',
        context: extractContext(text, pos),
        suggestion: 'Convert large numbers to strings to preserve precision',
        suggestionKey: 'errfind.largeNumber.fix',
        severity: 'warning'
      });
    });
  }

  return warnings;
}
