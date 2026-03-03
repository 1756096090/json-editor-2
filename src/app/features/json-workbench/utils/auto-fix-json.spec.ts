import { tryAutoFixJson } from './auto-fix-json';

describe('tryAutoFixJson', () => {

  // ── Already valid ──────────────────────────────────────────────────────────
  it('returns failure when input is already valid JSON', () => {
    const result = tryAutoFixJson('{"a":1}');
    expect(result.ok).toBeFalse();
  });

  // ── Trim & normalise ───────────────────────────────────────────────────────
  it('trims surrounding whitespace', () => {
    const result = tryAutoFixJson('   {"a":1}   ');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.fixedText.trim()).toBe('{"a":1}');
      expect(result.appliedFixes).toContain('trim');
    }
  });

  it('handles CRLF line endings', () => {
    const result = tryAutoFixJson('{\r\n  "a": 1\r\n}  ');
    expect(result.ok).toBeTrue();
  });

  // ── BOM ────────────────────────────────────────────────────────────────────
  it('strips UTF-8 BOM', () => {
    const result = tryAutoFixJson('\uFEFF{"a":1}');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.appliedFixes).toContain('bom');
    }
  });

  // ── Trailing commas ────────────────────────────────────────────────────────
  it('removes trailing comma in object', () => {
    const result = tryAutoFixJson('{"a":1,}');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
      expect(result.appliedFixes).toContain('trailing-commas');
    }
  });

  it('removes trailing comma in array', () => {
    const result = tryAutoFixJson('[1,2,3,]');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual([1, 2, 3]);
    }
  });

  it('removes trailing comma before nested closing bracket', () => {
    const result = tryAutoFixJson('{"a":[1,2,],}');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: [1, 2] });
    }
  });

  // ── Single quotes ──────────────────────────────────────────────────────────
  it('converts single-quoted keys and values to double quotes', () => {
    const result = tryAutoFixJson("{'a':'b'}");
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 'b' });
      expect(result.appliedFixes).toContain('single-quotes');
    }
  });

  it('does not break strings that already contain double quotes', () => {
    // This has a double quote inside — should still handle gracefully
    const result = tryAutoFixJson('{"a":"it\'s fine"}');
    // Already valid after parsing — our fn reports failure (already valid)
    expect(result.ok).toBeFalse();
  });

  it('handles escaped single quotes inside single-quoted strings', () => {
    const input = "{'key': 'it\\'s a test'}";
    const result = tryAutoFixJson(input);
    expect(result.ok).toBeTrue();
    if (result.ok) {
      const parsed = JSON.parse(result.fixedText);
      expect(parsed['key']).toBe("it's a test");
    }
  });

  // ── Missing closing brackets ───────────────────────────────────────────────
  it('appends missing closing brace', () => {
    const result = tryAutoFixJson('{"a":1');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
      expect(result.appliedFixes).toContain('close-brackets');
    }
  });

  it('appends missing closing bracket for array', () => {
    const result = tryAutoFixJson('[1,2,3');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual([1, 2, 3]);
    }
  });

  it('appends multiple missing closing brackets', () => {
    const result = tryAutoFixJson('{"a":{"b":1');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: { b: 1 } });
    }
  });

  // ── Extract first JSON block ───────────────────────────────────────────────
  it('extracts JSON from surrounding prose', () => {
    const result = tryAutoFixJson('Here is the data: {"a":1} and more text');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
      expect(result.appliedFixes).toContain('extract-block');
    }
  });

  it('extracts JSON array from prose', () => {
    const result = tryAutoFixJson('Result: [1,2,3] done');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual([1, 2, 3]);
    }
  });

  // ── Combined pipeline ──────────────────────────────────────────────────────
  it('combines trailing-commas + close-brackets fixes', () => {
    const result = tryAutoFixJson('{"a":1,');
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
    }
  });

  it('combines single-quotes + close-brackets', () => {
    const result = tryAutoFixJson("{'a':'b'");
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 'b' });
    }
  });

  // ── Hopeless input ────────────────────────────────────────────────────────
  it('returns failure when no fix is possible', () => {
    const result = tryAutoFixJson('this is not json at all');
    expect(result.ok).toBeFalse();
  });

  it('returns failure for empty string', () => {
    const result = tryAutoFixJson('');
    expect(result.ok).toBeFalse();
  });

  it('returns failure for plain number string (already valid JSON)', () => {
    // "42" is valid JSON per spec
    const result = tryAutoFixJson('42');
    expect(result.ok).toBeFalse(); // already valid → failure path
  });

});
