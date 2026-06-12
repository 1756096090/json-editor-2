import { describe, expect, it } from 'vitest';
import { tryAutoFixJson } from './autoFixJson';

describe('tryAutoFixJson', () => {
  it('does not change valid JSON', () => {
    const input = '{"url":"https://example.com","ok":true}';
    const result = tryAutoFixJson(input);

    expect(result.ok).toBe(true);
    expect(result.fixedText).toBe(input);
    expect(result.wasAlreadyValid).toBe(true);
    expect(result.appliedFixes).toEqual([]);
  });

  it('removes trailing commas', () => {
    const result = tryAutoFixJson('{"a":1,"b":[2,3,],}');

    expect(result.ok).toBe(true);
    expect(JSON.parse(result.formattedText)).toEqual({ a: 1, b: [2, 3] });
    expect(result.appliedFixes).toContain('remove-trailing-commas');
  });

  it('removes comments outside strings', () => {
    const result = tryAutoFixJson('{\n// comment\n"a":1, /* block */ "b":2\n}');

    expect(result.ok).toBe(true);
    expect(JSON.parse(result.formattedText)).toEqual({ a: 1, b: 2 });
    expect(result.appliedFixes).toContain('remove-comments');
  });

  it('does not damage URLs inside strings', () => {
    const input = '{"url":"https://example.com/a//b","note":"/* keep */"}';
    const result = tryAutoFixJson(input);

    expect(result.ok).toBe(true);
    expect(JSON.parse(result.formattedText)).toEqual({
      url: 'https://example.com/a//b',
      note: '/* keep */',
    });
  });

  it('quotes unquoted keys', () => {
    const result = tryAutoFixJson('{name:"JSONHUNT", enabled:true}');

    expect(result.ok).toBe(true);
    expect(JSON.parse(result.formattedText)).toEqual({ name: 'JSONHUNT', enabled: true });
    expect(result.appliedFixes).toContain('quote-unquoted-keys');
  });

  it('converts single quoted strings', () => {
    const result = tryAutoFixJson("{'name':'JSONHUNT','quote':'it\\'s ok'}");

    expect(result.ok).toBe(true);
    expect(JSON.parse(result.formattedText)).toEqual({ name: 'JSONHUNT', quote: "it's ok" });
    expect(result.appliedFixes).toContain('convert-single-quoted-strings');
  });

  it('extracts JSON from markdown fences', () => {
    const result = tryAutoFixJson('```json\n{"a":1}\n```');

    expect(result.ok).toBe(true);
    expect(JSON.parse(result.formattedText)).toEqual({ a: 1 });
    expect(result.appliedFixes).toContain('remove-markdown-fence');
  });

  it('adds missing closing braces', () => {
    const result = tryAutoFixJson('{"a":{"b":[1,2]');

    expect(result.ok).toBe(true);
    expect(JSON.parse(result.formattedText)).toEqual({ a: { b: [1, 2] } });
    expect(result.appliedFixes).toContain('close-missing-brackets');
  });

  it('returns an error for impossible JSON', () => {
    const result = tryAutoFixJson('this cannot be json');

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected impossible JSON to fail.');
    }
    expect(result.wasAlreadyValid).toBe(false);
    expect(result.formattedText).toBe('');
    expect(result.reason).toBeTruthy();
  });
});
