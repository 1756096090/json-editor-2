/**
 * Minimal JSON Schema (draft-07 subset) validator — no external dependencies.
 * Supports: type, properties, required, additionalProperties, items,
 * minLength, maxLength, minimum, maximum, exclusiveMinimum, exclusiveMaximum,
 * minItems, maxItems, enum, oneOf, anyOf, allOf, not.
 */

export interface SchemaError {
  path: string;
  /** English text, kept for logs and tests. */
  message: string;
  /** Translation key + params for the UI. */
  messageKey: TranslationKey;
  params?: Record<string, string | number>;
}

import type { TranslationKey } from '../../../core/i18n/en';

type JsonValue = unknown;
type Schema = Record<string, JsonValue>;

export function validateSchema(value: JsonValue, schema: Schema, path = '$'): SchemaError[] {
  const errors: SchemaError[] = [];

  // ── type ─────────────────────────────────────────────────────────────────
  if (schema['type'] !== undefined) {
    const types = Array.isArray(schema['type']) ? schema['type'] : [schema['type']];
    if (!types.some((t) => matchesType(value, t as string))) {
      errors.push({ path, message: `Expected type ${types.join(' | ')}, got ${getType(value)}`, messageKey: 'schemaErr.type', params: { expected: types.join(' | '), actual: getType(value) } });
    }
  }

  // ── enum ─────────────────────────────────────────────────────────────────
  if (Array.isArray(schema['enum'])) {
    const enumVals = schema['enum'] as JsonValue[];
    if (!enumVals.some((e) => deepEqual(e, value))) {
      errors.push({ path, message: `Value must be one of: ${enumVals.map((v) => JSON.stringify(v)).join(', ')}`, messageKey: 'schemaErr.enum', params: { values: enumVals.map((v) => JSON.stringify(v)).join(', ') } });
    }
  }

  // ── string constraints ───────────────────────────────────────────────────
  if (typeof value === 'string') {
    if (typeof schema['minLength'] === 'number' && value.length < schema['minLength']) {
      errors.push({ path, message: `String must be at least ${schema['minLength']} characters`, messageKey: 'schemaErr.minLength', params: { n: String(schema['minLength']) } });
    }
    if (typeof schema['maxLength'] === 'number' && value.length > schema['maxLength']) {
      errors.push({ path, message: `String must be at most ${schema['maxLength']} characters`, messageKey: 'schemaErr.maxLength', params: { n: String(schema['maxLength']) } });
    }
    if (schema['pattern'] !== undefined) {
      try {
        if (!new RegExp(schema['pattern'] as string).test(value)) {
          errors.push({ path, message: `String does not match pattern /${schema['pattern']}/`, messageKey: 'schemaErr.pattern', params: { pattern: String(schema['pattern']) } });
        }
      } catch {
        errors.push({ path, message: `Invalid pattern: ${schema['pattern']}`, messageKey: 'schemaErr.invalidPattern', params: { pattern: String(schema['pattern']) } });
      }
    }
  }

  // ── number constraints ───────────────────────────────────────────────────
  if (typeof value === 'number') {
    if (typeof schema['minimum'] === 'number' && value < schema['minimum']) {
      errors.push({ path, message: `Value must be >= ${schema['minimum']}`, messageKey: 'schemaErr.minimum', params: { n: String(schema['minimum']) } });
    }
    if (typeof schema['maximum'] === 'number' && value > schema['maximum']) {
      errors.push({ path, message: `Value must be <= ${schema['maximum']}`, messageKey: 'schemaErr.maximum', params: { n: String(schema['maximum']) } });
    }
    if (typeof schema['exclusiveMinimum'] === 'number' && value <= schema['exclusiveMinimum']) {
      errors.push({ path, message: `Value must be > ${schema['exclusiveMinimum']}`, messageKey: 'schemaErr.exclusiveMinimum', params: { n: String(schema['exclusiveMinimum']) } });
    }
    if (typeof schema['exclusiveMaximum'] === 'number' && value >= schema['exclusiveMaximum']) {
      errors.push({ path, message: `Value must be < ${schema['exclusiveMaximum']}`, messageKey: 'schemaErr.exclusiveMaximum', params: { n: String(schema['exclusiveMaximum']) } });
    }
    if (typeof schema['multipleOf'] === 'number' && value % schema['multipleOf'] !== 0) {
      errors.push({ path, message: `Value must be a multiple of ${schema['multipleOf']}`, messageKey: 'schemaErr.multipleOf', params: { n: String(schema['multipleOf']) } });
    }
  }

  // ── array constraints ────────────────────────────────────────────────────
  if (Array.isArray(value)) {
    if (typeof schema['minItems'] === 'number' && value.length < schema['minItems']) {
      errors.push({ path, message: `Array must have at least ${schema['minItems']} items`, messageKey: 'schemaErr.minItems', params: { n: String(schema['minItems']) } });
    }
    if (typeof schema['maxItems'] === 'number' && value.length > schema['maxItems']) {
      errors.push({ path, message: `Array must have at most ${schema['maxItems']} items`, messageKey: 'schemaErr.maxItems', params: { n: String(schema['maxItems']) } });
    }
    if (schema['items'] !== undefined) {
      const itemSchema = schema['items'] as Schema;
      value.forEach((item, i) => {
        errors.push(...validateSchema(item, itemSchema, `${path}[${i}]`));
      });
    }
    if (schema['uniqueItems'] && !hasUniqueItems(value)) {
      errors.push({ path, message: 'Array items must be unique', messageKey: 'schemaErr.unique' });
    }
  }

  // ── object constraints ───────────────────────────────────────────────────
  if (isObject(value)) {
    const obj = value as Record<string, JsonValue>;
    const props = (schema['properties'] ?? {}) as Record<string, Schema>;

    // required
    if (Array.isArray(schema['required'])) {
      for (const key of schema['required'] as string[]) {
        if (!(key in obj)) {
          errors.push({ path: `${path}.${key}`, message: `Required property '${key}' is missing`, messageKey: 'schemaErr.required', params: { key } });
        }
      }
    }

    // properties
    for (const [key, propSchema] of Object.entries(props)) {
      if (key in obj) {
        errors.push(...validateSchema(obj[key], propSchema, `${path}.${key}`));
      }
    }

    // additionalProperties
    if (schema['additionalProperties'] === false) {
      const extra = Object.keys(obj).filter((k) => !(k in props));
      for (const k of extra) {
        errors.push({ path: `${path}.${k}`, message: `Additional property '${k}' is not allowed`, messageKey: 'schemaErr.additional', params: { key: k } });
      }
    } else if (isObject(schema['additionalProperties'])) {
      const apSchema = schema['additionalProperties'] as Schema;
      const extra = Object.keys(obj).filter((k) => !(k in props));
      for (const k of extra) {
        errors.push(...validateSchema(obj[k], apSchema, `${path}.${k}`));
      }
    }
  }

  // ── combiners ────────────────────────────────────────────────────────────
  if (Array.isArray(schema['allOf'])) {
    for (const sub of schema['allOf'] as Schema[]) {
      errors.push(...validateSchema(value, sub, path));
    }
  }

  if (Array.isArray(schema['anyOf'])) {
    const passes = (schema['anyOf'] as Schema[]).some((sub) => validateSchema(value, sub, path).length === 0);
    if (!passes) {
      errors.push({ path, message: 'Value must match at least one of the anyOf schemas', messageKey: 'schemaErr.anyOf' });
    }
  }

  if (Array.isArray(schema['oneOf'])) {
    const matches = (schema['oneOf'] as Schema[]).filter((sub) => validateSchema(value, sub, path).length === 0);
    if (matches.length !== 1) {
      errors.push({ path, message: `Value must match exactly one of the oneOf schemas (matched ${matches.length})`, messageKey: 'schemaErr.oneOf', params: { n: matches.length } });
    }
  }

  if (isObject(schema['not'])) {
    const notErrors = validateSchema(value, schema['not'] as Schema, path);
    if (notErrors.length === 0) {
      errors.push({ path, message: 'Value must NOT match the "not" schema', messageKey: 'schemaErr.not' });
    }
  }

  return errors;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getType(value: JsonValue): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value: JsonValue, type: string): boolean {
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'null') return value === null;
  if (type === 'object') return isObject(value) && !Array.isArray(value);
  return typeof value === type;
}

function isObject(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepEqual(a: JsonValue, b: JsonValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hasUniqueItems(arr: JsonValue[]): boolean {
  const seen = new Set<string>();
  for (const item of arr) {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}
