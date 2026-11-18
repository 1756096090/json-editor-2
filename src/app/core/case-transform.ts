/**
 * Case conversion for the editor's "Convert case" selection tool.
 *
 * The tool only applies to a single key or value: `findCaseTarget` decides
 * whether a selection qualifies and which characters to rewrite (never the
 * surrounding quotes, so the JSON stays valid).
 */

export type CaseTransform =
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'upper-snake'
  | 'kebab'
  | 'flat'
  | 'train';

/** Every format, in menu order, with its display label. */
export const CASE_TRANSFORMS: readonly { readonly id: CaseTransform; readonly label: string }[] = [
  { id: 'camel', label: 'camelCase' },
  { id: 'pascal', label: 'PascalCase' },
  { id: 'snake', label: 'snake_case' },
  { id: 'upper-snake', label: 'UPPER_SNAKE_CASE' },
  { id: 'kebab', label: 'kebab-case' },
  { id: 'flat', label: 'flatcase' },
  { id: 'train', label: 'Train-Case' },
];

export const CASE_TRANSFORM_IDS: readonly CaseTransform[] = CASE_TRANSFORMS.map((t) => t.id);

export function isCaseTransform(value: unknown): value is CaseTransform {
  return typeof value === 'string' && (CASE_TRANSFORM_IDS as readonly string[]).includes(value);
}

/** Character range on one line: 0-based `start`, exclusive `end`. */
export interface CaseTarget {
  readonly start: number;
  readonly end: number;
}

/**
 * Returns the part of a single-line selection that "Convert case" may rewrite,
 * or null when the selection is not one key or value.
 *
 * - JSON: the selection must lie inside one string literal (a key or a string
 *   value). Selecting the quotes too is fine; they are excluded from the target.
 *   Anything touching structure (`{ } [ ] : ,`), numbers, booleans or two
 *   tokens returns null.
 * - Other languages (YAML, plain text): the selection, minus optional quotes,
 *   must not contain structural characters.
 */
export function findCaseTarget(
  lineText: string,
  start: number,
  end: number,
  language: string
): CaseTarget | null {
  if (start >= end) return null;

  const target =
    language === 'json'
      ? findJsonStringTarget(lineText, start, end)
      : findPlainTarget(lineText, start, end);

  if (!target) return null;
  return getCaseWords(lineText.slice(target.start, target.end)).length > 0 ? target : null;
}

function findJsonStringTarget(line: string, start: number, end: number): CaseTarget | null {
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '"') {
      i++;
      continue;
    }
    const open = i;
    let close = -1;
    for (let j = open + 1; j < line.length; j++) {
      if (line[j] === '\\') {
        j++;
        continue;
      }
      if (line[j] === '"') {
        close = j;
        break;
      }
    }
    if (close === -1) return null; // unterminated string: nothing safe to rewrite

    if (start >= open && end <= close + 1) {
      const innerStart = Math.max(start, open + 1);
      const innerEnd = Math.min(end, close);
      return innerStart < innerEnd ? { start: innerStart, end: innerEnd } : null;
    }
    i = close + 1;
  }
  return null;
}

function findPlainTarget(line: string, start: number, end: number): CaseTarget | null {
  let s = start;
  let e = end;
  const first = line[s];
  if ((first === '"' || first === "'") && line[e - 1] === first && e - s >= 2) {
    s++;
    e--;
  }
  return /[{}[\]:,#"']/.test(line.slice(s, e)) ? null : { start: s, end: e };
}

export function transformCase(value: string, transform: CaseTransform): string {
  const words = getCaseWords(value);
  if (words.length === 0) return value;

  switch (transform) {
    case 'camel':
      return joinCamel(words, false);
    case 'pascal':
      return joinCamel(words, true);
    case 'snake':
      return words.map((word) => word.toLowerCase()).join('_');
    case 'upper-snake':
      return words.map((word) => word.toUpperCase()).join('_');
    case 'kebab':
      return words.map((word) => word.toLowerCase()).join('-');
    case 'flat':
      return words.map((word) => word.toLowerCase()).join('');
    case 'train':
      return words.map(capitalize).join('-');
  }
}

function getCaseWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

function joinCamel(words: string[], pascal: boolean): string {
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 && !pascal ? lower : capitalize(lower);
    })
    .join('');
}

function capitalize(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
