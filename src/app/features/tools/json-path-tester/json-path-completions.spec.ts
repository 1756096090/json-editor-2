import { describe, expect, it } from 'vitest';
import { completeJsonPath } from './json-path-completions';

describe('JSONPath autocomplete', () => {
  const source = JSON.stringify({ user: { name: 'A', age: 2 }, users: [{ email: 'a' }], 'full name': 'A' });
  it('suggests root keys and safely quotes special keys', () => {
    expect(completeJsonPath(source, '$')).toEqual(['$.user', '$.users', '$["full name"]']);
  });
  it('filters partial keys and resolves nested objects', () => {
    expect(completeJsonPath(source, '$.us')).toEqual(['$.user', '$.users']);
    expect(completeJsonPath(source, '$.user.n')).toEqual(['$.user.name']);
  });
  it('suggests array indices, wildcards and keys inside matched items', () => {
    expect(completeJsonPath(source, '$.users')).toEqual(['$.users[*]', '$.users[0]']);
    expect(completeJsonPath(source, '$.users[*].')).toEqual(['$.users[*].email']);
  });
  it('handles invalid JSON and unknown paths without suggestions', () => {
    expect(completeJsonPath('{', '$')).toEqual([]);
    expect(completeJsonPath(source, '$.missing.')).toEqual([]);
  });
});
