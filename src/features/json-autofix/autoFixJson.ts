export type AutoFixLabel =
  | 'trim-whitespace'
  | 'normalize-line-endings'
  | 'remove-invisible-characters'
  | 'remove-markdown-fence'
  | 'normalize-smart-quotes'
  | 'remove-comments'
  | 'remove-trailing-commas'
  | 'convert-single-quoted-strings'
  | 'quote-unquoted-keys'
  | 'close-missing-brackets';

export interface AutoFixJsonSuccess {
  ok: true;
  fixedText: string;
  formattedText: string;
  appliedFixes: AutoFixLabel[];
  wasAlreadyValid: boolean;
}

export interface AutoFixJsonFailure {
  ok: false;
  fixedText: string;
  formattedText: '';
  appliedFixes: AutoFixLabel[];
  wasAlreadyValid: false;
  reason: string;
}

export type AutoFixJsonResult = AutoFixJsonSuccess | AutoFixJsonFailure;

type Transform = {
  label: AutoFixLabel;
  run: (text: string) => string;
};

const TRANSFORMS: readonly Transform[] = [
  { label: 'normalize-line-endings', run: normalizeLineEndings },
  { label: 'remove-invisible-characters', run: removeInvisibleCharacters },
  { label: 'trim-whitespace', run: trimWhitespace },
  { label: 'remove-markdown-fence', run: removeMarkdownFence },
  { label: 'normalize-smart-quotes', run: normalizeSmartQuotes },
  { label: 'remove-comments', run: removeCommentsOutsideStrings },
  { label: 'remove-trailing-commas', run: removeTrailingCommasOutsideStrings },
  { label: 'convert-single-quoted-strings', run: convertSingleQuotedStrings },
  { label: 'quote-unquoted-keys', run: quoteUnquotedKeysOutsideStrings },
  { label: 'close-missing-brackets', run: closeMissingBrackets },
];

export function tryAutoFixJson(input: string): AutoFixJsonResult {
  const original = input;
  const valid = parseJson(original);

  if (valid.ok) {
    return {
      ok: true,
      fixedText: original,
      formattedText: JSON.stringify(valid.value, null, 2),
      appliedFixes: [],
      wasAlreadyValid: true,
    };
  }

  let text = original;
  const appliedFixes: AutoFixLabel[] = [];

  for (const transform of TRANSFORMS) {
    const next = transform.run(text);
    if (next !== text) {
      text = next;
      appliedFixes.push(transform.label);
    }

    const parsed = parseJson(text);
    if (parsed.ok) {
      return {
        ok: true,
        fixedText: text,
        formattedText: JSON.stringify(parsed.value, null, 2),
        appliedFixes,
        wasAlreadyValid: false,
      };
    }
  }

  const parsed = parseJson(text);
  if (parsed.ok) {
    return {
      ok: true,
      fixedText: text,
      formattedText: JSON.stringify(parsed.value, null, 2),
      appliedFixes,
      wasAlreadyValid: false,
    };
  }

  return {
    ok: false,
    fixedText: text,
    formattedText: '',
    appliedFixes,
    wasAlreadyValid: false,
    reason: parsed.reason,
  };
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; reason: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Invalid JSON.',
    };
  }
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

function trimWhitespace(text: string): string {
  return text.trim();
}

function removeInvisibleCharacters(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/[\u0000\u200B-\u200D\u2060\uFEFF]/g, '');
}

function removeMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/);
  return match?.[1]?.trim() ?? text;
}

function normalizeSmartQuotes(text: string): string {
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function removeCommentsOutsideStrings(text: string): string {
  let result = '';
  let i = 0;
  let state: 'normal' | 'double' | 'single' | 'line-comment' | 'block-comment' = 'normal';

  while (i < text.length) {
    const ch = text[i] ?? '';
    const next = text[i + 1] ?? '';

    if (state === 'line-comment') {
      if (ch === '\n') {
        result += ch;
        state = 'normal';
      }
      i++;
      continue;
    }

    if (state === 'block-comment') {
      if (ch === '*' && next === '/') {
        i += 2;
        state = 'normal';
      } else {
        if (ch === '\n') result += '\n';
        i++;
      }
      continue;
    }

    if (state === 'double' || state === 'single') {
      result += ch;
      if (ch === '\\' && i + 1 < text.length) {
        result += text[i + 1];
        i += 2;
        continue;
      }
      if ((state === 'double' && ch === '"') || (state === 'single' && ch === "'")) {
        state = 'normal';
      }
      i++;
      continue;
    }

    if (ch === '"') {
      result += ch;
      state = 'double';
      i++;
      continue;
    }

    if (ch === "'") {
      result += ch;
      state = 'single';
      i++;
      continue;
    }

    if (ch === '/' && next === '/') {
      state = 'line-comment';
      i += 2;
      continue;
    }

    if (ch === '/' && next === '*') {
      state = 'block-comment';
      i += 2;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

function removeTrailingCommasOutsideStrings(text: string): string {
  let result = '';
  let i = 0;
  let inDoubleString = false;
  let inSingleString = false;

  while (i < text.length) {
    const ch = text[i] ?? '';

    if (inDoubleString || inSingleString) {
      result += ch;
      if (ch === '\\' && i + 1 < text.length) {
        result += text[i + 1];
        i += 2;
        continue;
      }
      if (inDoubleString && ch === '"') inDoubleString = false;
      if (inSingleString && ch === "'") inSingleString = false;
      i++;
      continue;
    }

    if (ch === '"') {
      inDoubleString = true;
      result += ch;
      i++;
      continue;
    }

    if (ch === "'") {
      inSingleString = true;
      result += ch;
      i++;
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (/\s/.test(text[j] ?? '')) j++;
      const closer = text[j];
      if (closer === '}' || closer === ']') {
        i++;
        continue;
      }
    }

    result += ch;
    i++;
  }

  return result;
}

function convertSingleQuotedStrings(text: string): string {
  let result = '';
  let i = 0;
  let inDoubleString = false;

  while (i < text.length) {
    const ch = text[i] ?? '';

    if (inDoubleString) {
      result += ch;
      if (ch === '\\' && i + 1 < text.length) {
        result += text[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') inDoubleString = false;
      i++;
      continue;
    }

    if (ch === '"') {
      inDoubleString = true;
      result += ch;
      i++;
      continue;
    }

    if (ch !== "'") {
      result += ch;
      i++;
      continue;
    }

    const parsed = readSingleQuotedString(text, i);
    if (!parsed) {
      result += ch;
      i++;
      continue;
    }

    result += JSON.stringify(parsed.value);
    i = parsed.end + 1;
  }

  return result;
}

function readSingleQuotedString(text: string, start: number): { value: string; end: number } | null {
  let value = '';
  let i = start + 1;

  while (i < text.length) {
    const ch = text[i] ?? '';
    if (ch === '\\' && i + 1 < text.length) {
      const next = text[i + 1] ?? '';
      value += next === "'" ? "'" : ch + next;
      i += 2;
      continue;
    }
    if (ch === "'") {
      return { value, end: i };
    }
    value += ch;
    i++;
  }

  return null;
}

function quoteUnquotedKeysOutsideStrings(text: string): string {
  let result = '';
  let i = 0;
  let inDoubleString = false;

  while (i < text.length) {
    const ch = text[i] ?? '';

    if (inDoubleString) {
      result += ch;
      if (ch === '\\' && i + 1 < text.length) {
        result += text[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') inDoubleString = false;
      i++;
      continue;
    }

    if (ch === '"') {
      inDoubleString = true;
      result += ch;
      i++;
      continue;
    }

    if (isIdentifierStart(ch) && isLikelyObjectKeyStart(result)) {
      let key = ch;
      let j = i + 1;
      while (isIdentifierPart(text[j] ?? '')) {
        key += text[j];
        j++;
      }

      let k = j;
      while (/\s/.test(text[k] ?? '')) k++;

      if (text[k] === ':') {
        result += JSON.stringify(key);
        i = j;
        continue;
      }
    }

    result += ch;
    i++;
  }

  return result;
}

function isLikelyObjectKeyStart(textBefore: string): boolean {
  let i = textBefore.length - 1;
  while (i >= 0 && /\s/.test(textBefore[i] ?? '')) i--;
  const previous = textBefore[i];
  return previous === '{' || previous === ',';
}

function isIdentifierStart(ch: string): boolean {
  return /[A-Za-z_$]/.test(ch);
}

function isIdentifierPart(ch: string): boolean {
  return /[A-Za-z0-9_$-]/.test(ch);
}

function closeMissingBrackets(text: string): string {
  const stack: string[] = [];
  let inDoubleString = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? '';

    if (inDoubleString) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === '"') inDoubleString = false;
      continue;
    }

    if (ch === '"') {
      inDoubleString = true;
      continue;
    }

    if (ch === '{') {
      stack.push('}');
      continue;
    }

    if (ch === '[') {
      stack.push(']');
      continue;
    }

    if (ch === '}' || ch === ']') {
      if (stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  return stack.length ? text + stack.reverse().join('') : text;
}
