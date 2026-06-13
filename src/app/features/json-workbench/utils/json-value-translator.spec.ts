import { translateJsonStringValues, TranslateFn } from './json-value-translator';

const upperTranslator: TranslateFn = (value) => Promise.resolve(value.toUpperCase());

describe('translateJsonStringValues', () => {
  it('translates only string values', async () => {
    const input = { name: 'john', active: true, age: 30, score: null };
    const result = await translateJsonStringValues(input, upperTranslator, 'en', 'es');
    expect(result.value).toEqual({ name: 'JOHN', active: true, age: 30, score: null });
  });

  it('does not translate object keys', async () => {
    const input = { name: 'john' };
    const result = await translateJsonStringValues(input, upperTranslator, 'en', 'es');
    expect(Object.keys(result.value as object)).toEqual(['name']);
  });

  it('preserves arrays and translates their string items', async () => {
    const input = { tags: ['one', 'two', 3, false] };
    const result = await translateJsonStringValues(input, upperTranslator, 'en', 'es');
    expect(result.value).toEqual({ tags: ['ONE', 'TWO', 3, false] });
    expect(Array.isArray((result.value as { tags: unknown }).tags)).toBe(true);
  });

  it('preserves deeply nested structure', async () => {
    const input = { user: { profile: { city: 'new york', zip: 10001 } } };
    const result = await translateJsonStringValues(input, upperTranslator, 'en', 'es');
    expect(result.value).toEqual({ user: { profile: { city: 'NEW YORK', zip: 10001 } } });
  });

  it('returns correct stats', async () => {
    const input = { a: 'x', b: ['y', 1], c: { d: 'z', e: true } };
    const result = await translateJsonStringValues(input, upperTranslator, 'en', 'fr');
    expect(result.stats.stringsFound).toBe(3);
    expect(result.stats.stringsTranslated).toBe(3);
    expect(result.stats.errors).toEqual([]);
    expect(result.stats.sourceLang).toBe('en');
    expect(result.stats.targetLang).toBe('fr');
  });

  it('keeps the original string and reports the error when the translator fails', async () => {
    const flaky: TranslateFn = (value) =>
      value === 'bad'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve(value.toUpperCase());

    const input = { ok: 'good', fail: 'bad' };
    const result = await translateJsonStringValues(input, flaky, 'en', 'es');
    expect(result.value).toEqual({ ok: 'GOOD', fail: 'bad' });
    expect(result.stats.stringsFound).toBe(2);
    expect(result.stats.stringsTranslated).toBe(1);
    expect(result.stats.errors).toEqual(['boom']);
  });

  it('handles top-level primitives', async () => {
    const result = await translateJsonStringValues('hello', upperTranslator, 'en', 'es');
    expect(result.value).toBe('HELLO');
    const numberResult = await translateJsonStringValues(42, upperTranslator, 'en', 'es');
    expect(numberResult.value).toBe(42);
  });
});
