import { Injectable } from '@angular/core';
import { BaseFormatHandler } from './base/base-format-handler';
import { ColorRule } from './models/color-rule.model';
import { jsonToYaml } from '../../features/tools/json-to-yaml/json-yaml.utils';

@Injectable({ providedIn: 'root' })
export class YamlFormatHandler extends BaseFormatHandler {
  readonly name = 'YAML';
  readonly extension = 'yaml';
  readonly mimeType = 'application/yaml';

  validate(content: string): boolean {
    if (content.trim() === '') return true;
    return this.getErrors(content).length === 0;
  }

  format(content: string): string {
    if (content.trim() === '') return '';

    // If the content is valid JSON, convert it to pretty YAML
    try {
      const parsed = JSON.parse(content);
      return jsonToYaml(parsed as Parameters<typeof jsonToYaml>[0]);
    } catch {
      // Already YAML — normalize indentation (2-space)
      return this.normalizeYamlIndent(content);
    }
  }

  minify(content: string): string {
    if (content.trim() === '') return '';
    return content
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
      .join('\n');
  }

  parse(content: string): unknown {
    // Try JSON first (JSON is valid YAML)
    try {
      return JSON.parse(content);
    } catch {
      // Return raw string — full YAML parsing requires an external library
      return content;
    }
  }

  stringify(data: unknown): string {
    return jsonToYaml(data as Parameters<typeof jsonToYaml>[0]);
  }

  override getErrors(content: string): string[] {
    if (content.trim() === '') return [];

    const errors: string[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip comments and empty lines
      if (line.trim() === '' || line.trim().startsWith('#')) continue;

      // Detect tab indentation (YAML requires spaces)
      if (line.match(/^\t/)) {
        errors.push(`Line ${lineNum}: Tabs are not allowed for indentation in YAML.`);
      }

      // Detect unclosed inline quotes
      const stripped = line.replace(/#.*$/, '');
      const singleQuotes = (stripped.match(/'/g) ?? []).length;
      const doubleQuotes = (stripped.match(/(?<!\\)"/g) ?? []).length;

      if (singleQuotes % 2 !== 0) {
        errors.push(`Line ${lineNum}: Unclosed single quote.`);
      }
      if (doubleQuotes % 2 !== 0) {
        errors.push(`Line ${lineNum}: Unclosed double quote.`);
      }
    }

    return errors;
  }

  getColorRules(): ColorRule[] {
    return [
      {
        name: 'comment',
        pattern: '#[^\\n]*',
        color: 'var(--color-text-muted)',
        description: 'YAML comment',
      },
      {
        name: 'key',
        pattern: '^[ \\t]*[\\w][\\w. -]*(?=\\s*:)',
        color: 'var(--color-accent)',
        fontWeight: 'var(--weight-semibold)',
        description: 'Mapping key',
      },
      {
        name: 'string',
        pattern: '"(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'',
        color: 'var(--color-json-string)',
        description: 'Quoted string',
      },
      {
        name: 'boolean',
        pattern: '\\b(?:true|false|yes|no|on|off)\\b',
        color: 'var(--color-json-boolean)',
        description: 'Boolean value',
      },
      {
        name: 'null',
        pattern: '\\b(?:null|~)\\b',
        color: 'var(--color-text-muted)',
        description: 'Null value',
      },
      {
        name: 'number',
        pattern: '(?<!\\w)-?(?:0x[\\da-fA-F]+|0o[0-7]+|\\d+(?:\\.\\d+)?(?:[eE][+\\-]?\\d+)?|\\.inf|\\.nan)(?!\\w)',
        color: 'var(--color-json-number)',
        description: 'Numeric value',
      },
      {
        name: 'block-indicator',
        pattern: '(?<=:\\s*)[|>][-+]?(?=\\s)',
        color: 'var(--color-json-boolean)',
        description: 'Block scalar indicator',
      },
      {
        name: 'list-item',
        pattern: '^[ \\t]*-(?= )',
        color: 'var(--color-accent)',
        description: 'List item marker',
      },
    ];
  }

  private normalizeYamlIndent(content: string): string {
    const lines = content.split('\n');
    const normalized = lines.map((line) => {
      const indentMatch = line.match(/^(\s+)/);
      if (!indentMatch) return line.trimEnd();
      const indent = indentMatch[1];
      const spaceCount = indent.replace(/\t/g, '  ').length;
      return ' '.repeat(spaceCount) + line.trimStart().trimEnd();
    });
    return normalized.join('\n').trimEnd();
  }
}
