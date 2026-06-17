import { tryAutoFixJson } from './auto-fix-json';

describe('tryAutoFixJson', () => {

  // ── Already valid ──────────────────────────────────────────────────────────
  it('returns success with no fixes when input is already valid JSON', () => {
    const result = tryAutoFixJson('{"a":1}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fixedText).toBe('{"a":1}');
      expect(result.appliedFixes).toEqual([]);
    }
  });

  it('returns the exact input unchanged for valid JSON with formatting', () => {
    const input = '{\n  "a": 1,\n  "b": [1, 2]\n}';
    const result = tryAutoFixJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fixedText).toBe(input);
      expect(result.appliedFixes).toEqual([]);
    }
  });

  it('returns success with no fixes for plain number string (valid JSON)', () => {
    const result = tryAutoFixJson('42');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fixedText).toBe('42');
      expect(result.appliedFixes).toEqual([]);
    }
  });

  it('does not modify valid strings containing apostrophes', () => {
    const input = '{"a":"it\'s fine"}';
    const result = tryAutoFixJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fixedText).toBe(input);
      expect(result.appliedFixes).toEqual([]);
    }
  });

  // ── Trim & normalise ───────────────────────────────────────────────────────
  it('treats whitespace-padded valid JSON as valid without changes', () => {
    const input = '   {"a":1}   ';
    const result = tryAutoFixJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fixedText).toBe(input);
      expect(result.appliedFixes).toEqual([]);
    }
  });

  it('handles CRLF line endings', () => {
    const result = tryAutoFixJson('{\r\n  "a": 1\r\n}  ');
    expect(result.ok).toBe(true);
  });

  // ── BOM ────────────────────────────────────────────────────────────────────
  it('strips UTF-8 BOM', () => {
    const result = tryAutoFixJson('\uFEFF{"a":1}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appliedFixes).toContain('bom');
    }
  });

  // ── Code fences ────────────────────────────────────────────────────────────
  it('strips ```json code fences', () => {
    const result = tryAutoFixJson('```json\n{"a":1}\n```');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
      expect(result.appliedFixes).toContain('code-fence');
    }
  });

  it('strips bare ``` code fences', () => {
    const result = tryAutoFixJson('```\n[1,2,3]\n```');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual([1, 2, 3]);
    }
  });

  // ── Smart quotes ───────────────────────────────────────────────────────────
  it('converts smart double quotes to straight quotes', () => {
    const result = tryAutoFixJson('{“a”:“b”}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 'b' });
      expect(result.appliedFixes).toContain('smart-quotes');
    }
  });

  // ── Comments ───────────────────────────────────────────────────────────────
  it('removes // line comments', () => {
    const result = tryAutoFixJson('{\n// comment\n"a": 1\n}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
      expect(result.appliedFixes).toContain('comments');
    }
  });

  it('removes /* block */ comments', () => {
    const result = tryAutoFixJson('{ /* note */ "a": 1 }');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
    }
  });

  it('does not break URLs with double slashes inside strings', () => {
    const input = '{\n// comment\n"url": "https://api.com/a//b"\n}';
    const result = tryAutoFixJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ url: 'https://api.com/a//b' });
    }
  });

  it('preserves URLs in valid JSON without modification', () => {
    const input = '{"url":"https://api.com/a//b"}';
    const result = tryAutoFixJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fixedText).toBe(input);
      expect(result.appliedFixes).toEqual([]);
    }
  });

  // ── Trailing commas ────────────────────────────────────────────────────────
  it('removes trailing comma in object', () => {
    const result = tryAutoFixJson('{"a":1,}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
      expect(result.appliedFixes).toContain('trailing-commas');
    }
  });

  it('removes trailing comma in array', () => {
    const result = tryAutoFixJson('[1,2,3,]');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual([1, 2, 3]);
    }
  });

  it('removes trailing comma before nested closing bracket', () => {
    const result = tryAutoFixJson('{"a":[1,2,],}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: [1, 2] });
    }
  });

  it('does not touch ",}" sequences inside string values', () => {
    const result = tryAutoFixJson('{"a": ",}" , "b": 2,}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: ',}', b: 2 });
    }
  });

  // ── Single quotes ──────────────────────────────────────────────────────────
  it('converts single-quoted keys and values to double quotes', () => {
    const result = tryAutoFixJson("{'a':'b'}");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 'b' });
      expect(result.appliedFixes).toContain('single-quotes');
    }
  });

  it('handles escaped single quotes inside single-quoted strings', () => {
    const input = "{'key': 'it\\'s a test'}";
    const result = tryAutoFixJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = JSON.parse(result.fixedText);
      expect(parsed['key']).toBe("it's a test");
    }
  });

  // ── Unquoted keys ──────────────────────────────────────────────────────────
  it('quotes bare object keys', () => {
    const result = tryAutoFixJson('{a: 1, b_c: "x"}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1, b_c: 'x' });
      expect(result.appliedFixes).toContain('unquoted-keys');
    }
  });

  it('does not quote identifier-like text inside string values', () => {
    const result = tryAutoFixJson('{a: "key: value"}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 'key: value' });
    }
  });

  // ── Missing commas ─────────────────────────────────────────────────────────
  it('inserts a missing comma between object properties', () => {
    const result = tryAutoFixJson('{"a":1 "b":2}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1, b: 2 });
    }
  });

  it('inserts missing commas between array items', () => {
    const result = tryAutoFixJson('[1 2 3]');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual([1, 2, 3]);
    }
  });

  it('inserts a missing comma between objects in an array', () => {
    const result = tryAutoFixJson('[{"a":1} {"b":2}]');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual([{ a: 1 }, { b: 2 }]);
    }
  });

  it('inserts a missing comma between string values', () => {
    const result = tryAutoFixJson('["a" "b"]');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual(['a', 'b']);
    }
  });

  it('does not insert commas inside string values that contain spaces', () => {
    const result = tryAutoFixJson('{"a":"one two three"}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fixedText).toBe('{"a":"one two three"}');
      expect(result.appliedFixes).toEqual([]);
    }
  });

  // ── Missing quotes ─────────────────────────────────────────────────────────
  it('closes an unterminated string at end of line', () => {
    const result = tryAutoFixJson('{\n  "a": "hello\n}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 'hello' });
    }
  });

  it('closes an unterminated string at end of input', () => {
    const result = tryAutoFixJson('{"a": "hello');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 'hello' });
    }
  });

  // ── Missing closing brackets ───────────────────────────────────────────────
  it('appends missing closing brace', () => {
    const result = tryAutoFixJson('{"a":1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
      expect(result.appliedFixes).toContain('close-brackets');
    }
  });

  it('appends missing closing bracket for array', () => {
    const result = tryAutoFixJson('[1,2,3');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual([1, 2, 3]);
    }
  });

  it('appends multiple missing closing brackets', () => {
    const result = tryAutoFixJson('{"a":{"b":1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: { b: 1 } });
    }
  });

  // ── Extract first JSON block ───────────────────────────────────────────────
  it('extracts JSON from surrounding prose', () => {
    const result = tryAutoFixJson('Here is the data: {"a":1} and more text');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
      expect(result.appliedFixes).toContain('extract-block');
    }
  });

  it('extracts JSON array from prose', () => {
    const result = tryAutoFixJson('Result: [1,2,3] done');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual([1, 2, 3]);
    }
  });

  // ── Combined pipeline ──────────────────────────────────────────────────────
  it('combines trailing-commas + close-brackets fixes', () => {
    const result = tryAutoFixJson('{"a":1,');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
    }
  });

  it('combines single-quotes + close-brackets', () => {
    const result = tryAutoFixJson("{'a':'b'");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 'b' });
    }
  });

  it('fixes fenced JSON with comments and trailing commas', () => {
    const input = '```json\n{\n  // config\n  "a": 1,\n}\n```';
    const result = tryAutoFixJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.fixedText)).toEqual({ a: 1 });
    }
  });

  // ── Hopeless input ────────────────────────────────────────────────────────
  it('returns failure when no fix is possible', () => {
    const result = tryAutoFixJson('this is not json at all');
    expect(result.ok).toBe(false);
  });

  it('returns failure for empty string', () => {
    const result = tryAutoFixJson('');
    expect(result.ok).toBe(false);
  });

});
