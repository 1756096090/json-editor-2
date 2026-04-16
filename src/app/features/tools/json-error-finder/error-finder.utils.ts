/**
 * error-finder.utils.ts
 * Comprehensive JSON error analysis and location reporting
 */

export interface JsonErrorInfo {
  line: number;
  column: number;
  charIndex: number;
  errorType: string;
  message: string;
  context: string; // surrounding code snippet
  suggestion: string;
  severity: 'error' | 'warning';
}

export interface ErrorFinderResult {
  isValid: boolean;
  errors: JsonErrorInfo[];
  summary: string;
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
        context: '',
        suggestion: 'Paste valid JSON to analyze',
        severity: 'error'
      }],
      summary: '1 error found: Empty input'
    };
  }

  // Try standard JSON.parse first
  try {
    JSON.parse(trimmed);
    return {
      isValid: true,
      errors: [],
      summary: 'Valid JSON ✓'
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
      suggestion: suggestFix(trimmed, position, error.message),
      severity: 'error'
    };

    errors.push(errorInfo);
  }

  // Additional linting checks (warnings)
  const warnings = performJsonLinting(trimmed);
  errors.push(...warnings);

  const summary = `${errors.filter(e => e.severity === 'error').length} error(s), ${errors.filter(e => e.severity === 'warning').length} warning(s)`;

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    summary
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
function suggestFix(text: string, position: number, message: string): string {
  const char = text[position] || 'EOF';

  if (message.includes('Trailing comma')) {
    return 'Remove the comma before the closing bracket/brace';
  }

  if (char === ',') {
    return 'Unexpected comma. Check for: trailing commas, missing values, or syntax errors nearby';
  }

  if (message.includes('Unexpected end of JSON input')) {
    return 'JSON is incomplete. Check for: unclosed braces, brackets, or strings';
  }

  if (char === undefined && message.includes('Unexpected end')) {
    return 'JSON ends prematurely. Add closing brackets: ] or }';
  }

  if (message.includes('Unexpected token')) {
    return `Unexpected character: '${char}'. Check JSON syntax around this position`;
  }

  return 'Check the JSON syntax at the error position. Ensure all brackets, braces, and quotes are properly paired.';
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
        context: extractContext(text, pos),
        suggestion: 'Convert large numbers to strings to preserve precision',
        severity: 'warning'
      });
    });
  }

  return warnings;
}
