import {
  formatPathDots,
  formatPathJava,
  formatPathJs,
  formatPathJsSafe,
  formatPathPython,
  getJsonPathAtOffset,
} from './json-path-inspector';

describe('getJsonPathAtOffset', () => {
  it('resolves the path of a simple object value', () => {
    const text = '{"name": "Isaac"}';
    const offset = text.indexOf('"Isaac"') + 2;
    expect(getJsonPathAtOffset(text, offset)).toEqual(['name']);
  });

  it('resolves nested object paths', () => {
    const text = '{"usuarios": {"usuario": {"nombre": "Isaac"}}}';
    const offset = text.indexOf('"Isaac"') + 2;
    expect(getJsonPathAtOffset(text, offset)).toEqual(['usuarios', 'usuario', 'nombre']);
  });

  it('resolves paths through arrays with numeric segments', () => {
    const text = '{"usuarios": [{"nombre": "Ana"}, {"nombre": "Luis"}]}';
    const offset = text.indexOf('"Luis"') + 2;
    expect(getJsonPathAtOffset(text, offset)).toEqual(['usuarios', 1, 'nombre']);
  });

  it('resolves the path when the cursor is on an object key', () => {
    const text = '{"usuarios": {"nombre": "Isaac"}}';
    const offset = text.indexOf('"nombre"') + 3;
    expect(getJsonPathAtOffset(text, offset)).toEqual(['usuarios', 'nombre']);
  });

  it('resolves numbers, booleans and null values', () => {
    const text = '{"a": 30, "b": true, "c": null}';
    expect(getJsonPathAtOffset(text, text.indexOf('30') + 1)).toEqual(['a']);
    expect(getJsonPathAtOffset(text, text.indexOf('true') + 1)).toEqual(['b']);
    expect(getJsonPathAtOffset(text, text.indexOf('null') + 1)).toEqual(['c']);
  });

  it('returns the container path when the cursor sits on structure whitespace', () => {
    const text = '{"a": { "b": 1 }}';
    const offset = text.indexOf('{ ') + 1;
    expect(getJsonPathAtOffset(text, offset)).toEqual(['a']);
  });

  it('returns null for invalid JSON', () => {
    expect(getJsonPathAtOffset('{"a": ', 3)).toBeNull();
    expect(getJsonPathAtOffset('not json', 2)).toBeNull();
  });

  it('does not break with out-of-range offsets', () => {
    const text = '{"a": 1}';
    expect(getJsonPathAtOffset(text, -5)).toBeNull();
    expect(getJsonPathAtOffset(text, 9999)).toBeNull();
  });

  it('handles keys containing special characters', () => {
    const text = '{"a b": {"c-d": 1}}';
    const offset = text.indexOf('1');
    expect(getJsonPathAtOffset(text, offset)).toEqual(['a b', 'c-d']);
  });
});

describe('path formatters', () => {
  const path = ['usuarios', 0, 'nombre'] as (string | number)[];

  it('formats visual dot paths', () => {
    expect(formatPathDots(path)).toBe('usuarios.0.nombre');
    expect(formatPathDots(['usuarios', 'usuario', 'nombre'])).toBe('usuarios.usuario.nombre');
  });

  it('formats JavaScript paths', () => {
    expect(formatPathJs(path)).toBe('data.usuarios[0].nombre');
  });

  it('formats safe JavaScript paths with optional chaining', () => {
    expect(formatPathJsSafe(path)).toBe('data?.usuarios?.[0]?.nombre');
  });

  it('formats Python paths', () => {
    expect(formatPathPython(path)).toBe('data["usuarios"][0]["nombre"]');
  });

  it('formats Java paths', () => {
    expect(formatPathJava(path)).toBe('data.get("usuarios").get(0).get("nombre")');
  });

  it('uses bracket access in JS for keys that are not identifiers', () => {
    expect(formatPathJs(['a b', 'c'])).toBe('data["a b"].c');
    expect(formatPathJsSafe(['a b'])).toBe('data?.["a b"]');
  });
});
