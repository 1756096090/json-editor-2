import { describe, expect, it } from 'vitest';
import { computeDiff } from './diff-engine';

describe('diff highlighting', () => {
  it('highlights only an inserted comma without deleting the original line', () => {
    const result = computeDiff('{\n  "version": 1\n}', '{\n  "version": 1,\n}');
    expect(result.leftDecorations).toEqual([]);
    expect(result.removedCount).toBe(0);
    expect(result.rightDecorations).toEqual([
      { lineNumber: 2, kind: 'added', startColumn: 15, endColumn: 16 },
    ]);
  });
  it('keeps unchanged braces and properties clear when adding a field', () => {
    const result = computeDiff('{\n  "a": 1\n}', '{\n  "a": 1,\n  "b": 2\n}');
    expect(result.leftDecorations).toEqual([]);
    expect(result.rightDecorations.every(d => d.kind === 'added' && d.lineNumber !== 4)).toBe(true);
  });
  it('marks only the removed character for a pure inline deletion', () => {
    const result = computeDiff('{"a":12}', '{"a":1}');
    expect(result.rightDecorations).toEqual([]);
    expect(result.leftDecorations).toEqual([{ lineNumber: 1, kind: 'removed', startColumn: 7, endColumn: 8 }]);
  });
  it('retains both colors for a replacement and handles identical documents', () => {
    const result = computeDiff('{"a":1}', '{"a":2}');
    expect(result.leftDecorations[0].kind).toBe('removed');
    expect(result.rightDecorations[0].kind).toBe('added');
    expect(computeDiff('{}', '{}').hunks).toEqual([]);
  });
  it('marks a deleted field red without marking the remaining document green', () => {
    const result = computeDiff('{\n  "a": 1,\n  "b": 2\n}', '{\n  "a": 1\n}');
    expect(result.rightDecorations).toEqual([]);
    expect(result.leftDecorations.length).toBeGreaterThan(0);
    expect(result.leftDecorations.every(d => d.kind === 'removed' && d.lineNumber !== 4)).toBe(true);
    expect(result.addedCount).toBe(0);
  });
  it('marks only the text of a removed line and leaves context untouched', () => {
    const result = computeDiff('one\ntwo\nthree\n', 'one\nthree\n');
    expect(result.rightDecorations).toEqual([]);
    expect(result.leftDecorations).toEqual([{ lineNumber: 2, kind: 'removed', startColumn: 1, endColumn: 4 }]);
  });
  it('keeps UTF-16 columns correct after emoji and normalizes CRLF', () => {
    const result = computeDiff('{"x":"😀ab"}\r\n', '{"x":"😀a"}\r\n');
    expect(result.rightDecorations).toEqual([]);
    expect(result.leftDecorations).toEqual([{ lineNumber: 1, kind: 'removed', startColumn: 10, endColumn: 11 }]);
  });
});
