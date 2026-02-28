export type JsonBracket = '{' | '}' | '[' | ']';

interface OpenBracketToken {
  char: '{' | '[';
  index: number;
}

export function findMismatchedBracketIndexes(source: string): number[] {
  const stack: OpenBracketToken[] = [];
  const mismatches: number[] = [];

  let inString = false;
  let escaping = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === '\\') {
        escaping = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      stack.push({ char, index });
      continue;
    }

    if (char === '}' || char === ']') {
      const top = stack.at(-1);
      if (!top) {
        mismatches.push(index);
        continue;
      }

      if (matches(top.char, char)) {
        stack.pop();
      } else {
        mismatches.push(index);
      }
    }
  }

  for (const token of stack) {
    mismatches.push(token.index);
  }

  mismatches.sort((left, right) => left - right);
  return mismatches;
}

export function buildBracketHighlightHtml(source: string, mismatchIndexes: readonly number[]): string {
  if (!source) {
    return '';
  }

  const mismatchSet = new Set<number>(mismatchIndexes);
  let html = '';

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const safeChar = escapeHtml(char);

    if (mismatchSet.has(index) && isBracket(char)) {
      html += `<span class="wb-bracket-mismatch">${safeChar}</span>`;
      continue;
    }

    html += safeChar;
  }

  return html;
}

function matches(open: '{' | '[', close: '}' | ']'): boolean {
  return (open === '{' && close === '}') || (open === '[' && close === ']');
}

function isBracket(char: string): char is JsonBracket {
  return char === '{' || char === '}' || char === '[' || char === ']';
}

function escapeHtml(value: string): string {
  switch (value) {
    case '&':
      return '&amp;';
    case '<':
      return '&lt;';
    case '>':
      return '&gt;';
    case '"':
      return '&quot;';
    case "'":
      return '&#39;';
    default:
      return value;
  }
}
