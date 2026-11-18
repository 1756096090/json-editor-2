/**
 * JSON → JSON Schema (draft-07) generator — no external dependencies.
 * Infers a schema that the input JSON itself always validates against.
 *
 * - `$schema` is declared once, on the root.
 * - Object keys are `required`; in arrays of objects only keys present in
 *   every item are required, the rest stay optional.
 * - Array items are merged into a single schema; integer + number widen to
 *   number, distinct types become a de-duplicated `anyOf`.
 */

type JsonSchema = Record<string, unknown>;

const DRAFT_07 = 'http://json-schema.org/draft-07/schema#';

export function generateSchema(value: unknown): JsonSchema {
  return { $schema: DRAFT_07, ...inferSchema(value) };
}

function inferSchema(value: unknown): JsonSchema {
  if (value === null) return { type: 'null' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' };
  if (typeof value === 'string') return { type: 'string' };

  if (Array.isArray(value)) {
    return value.length === 0
      ? { type: 'array', items: {} }
      : { type: 'array', items: mergeSchemas(value.map(inferSchema)) };
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  const properties: Record<string, JsonSchema> = {};
  for (const key of keys) {
    properties[key] = inferSchema(obj[key]);
  }
  return {
    type: 'object',
    properties,
    ...(keys.length > 0 ? { required: keys } : {}),
    additionalProperties: false,
  };
}

/** Merge sibling schemas (e.g. every item of one array) into one schema. */
function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  const unique = dedupe(schemas);
  if (unique.length === 1) return unique[0];

  if (unique.every(isNumeric)) return { type: 'number' };
  if (unique.every((s) => s['type'] === 'object')) return mergeObjects(unique);
  if (unique.every((s) => s['type'] === 'array')) return mergeArrays(unique);

  // Mixed types: merge within each type family, then offer the variants.
  const groups = new Map<string, JsonSchema[]>();
  for (const schema of unique) {
    const family = isNumeric(schema) ? 'number' : String(schema['type']);
    groups.set(family, [...(groups.get(family) ?? []), schema]);
  }
  const variants = [...groups.values()].map(mergeSchemas);
  return variants.length === 1 ? variants[0] : { anyOf: variants };
}

function mergeObjects(schemas: JsonSchema[]): JsonSchema {
  const propertyLists = new Map<string, JsonSchema[]>();
  for (const schema of schemas) {
    const props = schema['properties'] as Record<string, JsonSchema>;
    for (const [key, propSchema] of Object.entries(props)) {
      propertyLists.set(key, [...(propertyLists.get(key) ?? []), propSchema]);
    }
  }

  const properties: Record<string, JsonSchema> = {};
  for (const [key, list] of propertyLists) {
    properties[key] = mergeSchemas(list);
  }

  const required = [...propertyLists.keys()].filter((key) =>
    schemas.every((s) => ((s['required'] as string[] | undefined) ?? []).includes(key))
  );

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: false,
  };
}

function mergeArrays(schemas: JsonSchema[]): JsonSchema {
  // Empty arrays (`items: {}`) say nothing about the item type: skip them.
  const itemSchemas = schemas
    .map((s) => s['items'] as JsonSchema)
    .filter((items) => Object.keys(items).length > 0);
  return { type: 'array', items: itemSchemas.length > 0 ? mergeSchemas(itemSchemas) : {} };
}

function isNumeric(schema: JsonSchema): boolean {
  return schema['type'] === 'integer' || schema['type'] === 'number';
}

function dedupe(schemas: JsonSchema[]): JsonSchema[] {
  const seen = new Map<string, JsonSchema>();
  for (const schema of schemas) {
    seen.set(JSON.stringify(schema), schema);
  }
  return [...seen.values()];
}
