import { describe, expect, it } from 'vitest';
import { evaluateJsonPath } from './json-path';

describe('JSONPath evaluation', () => {
  const data = { books: [{ name: 'A' }, { name: 'B' }], name: 'Library' };
  it('returns matching values and paths for wildcards', () => {
    expect(evaluateJsonPath(data, '$.books[*].name')).toEqual([
      { path: '$.books[0].name', value: 'A' },
      { path: '$.books[1].name', value: 'B' },
    ]);
  });
  it('supports root, recursive descent, quoted keys and negative indices', () => {
    expect(evaluateJsonPath(data, '$')[0].value).toBe(data);
    expect(evaluateJsonPath(data, '$..name').map(result => result.value)).toEqual(['Library', 'A', 'B']);
    expect(evaluateJsonPath(data, "$['books'][-1].name")[0].value).toBe('B');
  });
  it('handles slices, unions and absent properties', () => {
    expect(evaluateJsonPath([1, 2, 3], '$[-99:2]').map(result => result.value)).toEqual([1, 2]);
    expect(evaluateJsonPath([1, 2, 3], '$[0,2]').map(result => result.value)).toEqual([1, 3]);
    expect(evaluateJsonPath(data, '$.missing')).toEqual([]);
    expect(evaluateJsonPath({}, '$.constructor')).toEqual([]);
  });
  it('rejects malformed and unsupported expressions even after missing keys', () => {
    for (const expression of ['books', '$.books[', '$.missing.', '$[?(@.x)]', '$[1oops]']) {
      expect(() => evaluateJsonPath(data, expression)).toThrow();
    }
  });
});
