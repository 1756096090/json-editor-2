/**
 * JSON → JSON Schema (draft-07) generator — no external dependencies.
 * Generates an object schema that reflects the structure of the input JSON.
 */

type JsonSchema = Record<string, unknown>;
type JsonValue = unknown;

export function generateSchema(value: JsonValue): JsonSchema {
  if (value === null) return { type: 'null' };

  if (typeof value === 'boolean') return { type: 'boolean' };

  if (typeof value === 'number') {
    const schema: JsonSchema = { type: Number.isInteger(value) ? 'integer' : 'number' };
    return schema;
  }

  if (typeof value === 'string') return { type: 'string' };

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'array', items: {} };
    }
    // Merge all item schemas
    const itemSchemas = value.map((item) => generateSchema(item));
    const merged = itemSchemas.length === 1 ? itemSchemas[0] : mergeSchemas(itemSchemas);
    return { type: 'array', items: merged };
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, JsonValue>;
    const properties: Record<string, JsonSchema> = {};
    for (const [k, v] of Object.entries(obj)) {
      properties[k] = generateSchema(v);
    }
    const required = Object.keys(obj);
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
      additionalProperties: false,
    };
  }

  return {};
}

/** Merge multiple schemas — produce a union type if types differ. */
function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  const types = [...new Set(schemas.map((s) => s['type'] as string).filter(Boolean))];

  if (types.length === 1 && types[0] === 'object') {
    // Merge object schemas
    const allProps = schemas
      .map((s) => s['properties'] as Record<string, JsonSchema> | undefined)
      .filter(Boolean) as Record<string, JsonSchema>[];

    const mergedProps: Record<string, JsonSchema> = {};
    for (const propsMap of allProps) {
      for (const [k, v] of Object.entries(propsMap)) {
        mergedProps[k] = k in mergedProps ? mergeTwo(mergedProps[k], v) : v;
      }
    }

    return { type: 'object', properties: mergedProps };
  }

  if (types.length === 1) return schemas[0];

  // Mixed types → anyOf
  return { anyOf: schemas };
}

function mergeTwo(a: JsonSchema, b: JsonSchema): JsonSchema {
  if (JSON.stringify(a) === JSON.stringify(b)) return a;
  return { anyOf: [a, b] };
}
