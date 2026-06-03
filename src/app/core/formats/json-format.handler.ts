import { Injectable } from '@angular/core';
import { BaseFormatHandler } from './base/base-format-handler';
import { ColorRule } from './models/color-rule.model';

@Injectable({ providedIn: 'root' })
export class JsonFormatHandler extends BaseFormatHandler {
  readonly name = 'JSON';
  readonly extension = 'json';
  readonly mimeType = 'application/json';

  validate(content: string): boolean {
    if (content.trim() === '') return true;
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  format(content: string): string {
    if (content.trim() === '') return '';
    const parsed = this.parse(content);
    return this.stringify(parsed);
  }

  minify(content: string): string {
    if (content.trim() === '') return '';
    const parsed = this.parse(content);
    return JSON.stringify(parsed);
  }

  parse(content: string): unknown {
    return JSON.parse(content);
  }

  stringify(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  getColorRules(): ColorRule[] {
    return [
      {
        name: 'key',
        pattern: '"(?:\\\\u[a-fA-F0-9]{4}|\\\\[^u]|[^\\\\"])*"(?:\\s*:)',
        color: 'var(--color-accent)',
        fontWeight: 'var(--weight-semibold)',
        description: 'Object key',
      },
      {
        name: 'string',
        pattern: '"(?:\\\\u[a-fA-F0-9]{4}|\\\\[^u]|[^\\\\"])*"',
        color: 'var(--color-json-string)',
        description: 'String value',
      },
      {
        name: 'boolean',
        pattern: '\\btrue\\b|\\bfalse\\b',
        color: 'var(--color-json-boolean)',
        description: 'Boolean value',
      },
      {
        name: 'null',
        pattern: '\\bnull\\b',
        color: 'var(--color-text-muted)',
        description: 'Null value',
      },
      {
        name: 'number',
        pattern: '-?\\d+(?:\\.\\d+)?(?:[eE][+\\-]?\\d+)?',
        color: 'var(--color-json-number)',
        description: 'Numeric value',
      },
    ];
  }
}
