import { findCaseTarget, transformCase } from './case-transform';

/** Selects `fragment` (first occurrence at or after `from`) on `line`. */
function select(line: string, fragment: string, from = 0): [number, number] {
  const start = line.indexOf(fragment, from);
  if (start < 0) throw new Error(`"${fragment}" not in line`);
  return [start, start + fragment.length];
}

function target(line: string, fragment: string, language = 'json', from = 0): string | null {
  const [start, end] = select(line, fragment, from);
  const found = findCaseTarget(line, start, end, language);
  return found ? line.slice(found.start, found.end) : null;
}

describe('findCaseTarget — JSON', () => {
  const line = '  "firstName": "Ada Lovelace", "age": 36, "admin": true,';

  it('accepts a key or a string value', () => {
    expect(target(line, 'firstName')).toBe('firstName');
    expect(target(line, 'Ada Lovelace')).toBe('Ada Lovelace');
  });

  it('accepts part of a key or value', () => {
    expect(target(line, 'Lovelace')).toBe('Lovelace');
  });

  it('accepts the quotes but leaves them out of the target', () => {
    expect(target(line, '"firstName"')).toBe('firstName');
    expect(target(line, '"Ada Lovelace')).toBe('Ada Lovelace');
  });

  it('rejects selections that reach the structure', () => {
    expect(target(line, '"firstName":')).toBeNull();
    expect(target(line, 'firstName": "Ada')).toBeNull();
    expect(target(line, '"Ada Lovelace",')).toBeNull();
    expect(target(line, line.trim())).toBeNull();
  });

  it('rejects numbers, booleans and bare punctuation', () => {
    expect(target(line, '36')).toBeNull();
    expect(target(line, 'true')).toBeNull();
    expect(target('{ "a": [1, 2] }', '{ "a"')).toBeNull();
    expect(target('{ "a": [1, 2] }', '[1, 2]')).toBeNull();
  });

  it('rejects a selection of only the quotes', () => {
    expect(target('  "": 1', '""')).toBeNull();
  });

  it('handles escaped quotes inside strings', () => {
    const escaped = '  "say": "a \\"quoted\\" word"';
    expect(target(escaped, 'quoted')).toBe('quoted');
    expect(target(escaped, 'a \\"quoted\\" word')).toBe('a \\"quoted\\" word');
  });
});

describe('findCaseTarget — other languages', () => {
  it('accepts a YAML key or value and rejects structure', () => {
    const yaml = 'user_name: Ada Lovelace';
    expect(target(yaml, 'user_name', 'yaml')).toBe('user_name');
    expect(target(yaml, 'Ada Lovelace', 'yaml')).toBe('Ada Lovelace');
    expect(target(yaml, 'user_name:', 'yaml')).toBeNull();
  });
});

describe('transformCase', () => {
  it('converts between the supported formats', () => {
    expect(transformCase('first name', 'camel')).toBe('firstName');
    expect(transformCase('firstName', 'pascal')).toBe('FirstName');
    expect(transformCase('firstName', 'snake')).toBe('first_name');
    expect(transformCase('firstName', 'upper-snake')).toBe('FIRST_NAME');
    expect(transformCase('first_name', 'kebab')).toBe('first-name');
    expect(transformCase('First-Name', 'flat')).toBe('firstname');
    expect(transformCase('first_name', 'train')).toBe('First-Name');
  });
});
