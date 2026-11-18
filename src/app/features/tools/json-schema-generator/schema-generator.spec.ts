import { generateSchema } from './schema-generator';
import { validateSchema } from '../json-schema-validator/schema-validator';

const DRAFT_07 = 'http://json-schema.org/draft-07/schema#';

describe('generateSchema', () => {
  it('types primitives and declares draft-07 on the root only', () => {
    expect(generateSchema('a')).toEqual({ $schema: DRAFT_07, type: 'string' });
    expect(generateSchema(1)).toEqual({ $schema: DRAFT_07, type: 'integer' });
    expect(generateSchema(1.5)).toEqual({ $schema: DRAFT_07, type: 'number' });
    expect(generateSchema(true)).toEqual({ $schema: DRAFT_07, type: 'boolean' });
    expect(generateSchema(null)).toEqual({ $schema: DRAFT_07, type: 'null' });
  });

  it('does not repeat $schema on nested objects', () => {
    const schema = generateSchema({ user: { name: 'Ada' } });
    const user = (schema['properties'] as Record<string, Record<string, unknown>>)['user'];
    expect(user['$schema']).toBeUndefined();
    expect(user).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    });
  });

  it('requires only keys present in every object of an array', () => {
    const schema = generateSchema([{ id: 1, tag: 'x' }, { id: 2 }]);
    expect(schema['items']).toEqual({
      type: 'object',
      properties: { id: { type: 'integer' }, tag: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    });
  });

  it('widens integer and number to number', () => {
    expect(generateSchema([1, 2.5])['items']).toEqual({ type: 'number' });
  });

  it('builds a de-duplicated anyOf for mixed item types', () => {
    expect(generateSchema([1, 'a', 2, 'b', null])['items']).toEqual({
      anyOf: [{ type: 'integer' }, { type: 'string' }, { type: 'null' }],
    });
  });

  it('ignores empty arrays when merging nested array items', () => {
    expect(generateSchema([[], [1, 2]])['items']).toEqual({
      type: 'array',
      items: { type: 'integer' },
    });
    expect(generateSchema([])).toEqual({ $schema: DRAFT_07, type: 'array', items: {} });
  });

  it('produces a schema that validates the source document', () => {
    const source = {
      name: 'JSON Hunt',
      version: 2,
      ratio: 0.5,
      tags: ['a', 'b'],
      items: [
        { id: 1, price: 9.99, meta: { featured: true } },
        { id: 2, price: 10, note: null, meta: { featured: false } },
      ],
      nested: [[], [[1, 'x']]],
    };
    expect(validateSchema(source, generateSchema(source))).toEqual([]);
  });
});
