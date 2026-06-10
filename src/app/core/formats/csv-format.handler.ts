import { Injectable } from '@angular/core';
import { BaseFormatHandler } from './base/base-format-handler';
import { ColorRule } from './models/color-rule.model';
import { jsonToCsv } from '../../features/json-workbench/utils/convert.utils';

@Injectable({ providedIn: 'root' })
export class CsvFormatHandler extends BaseFormatHandler {
  readonly name = 'CSV';
  readonly extension = 'csv';
  readonly mimeType = 'text/csv';

  validate(content: string): boolean {
    if (content.trim() === '') return true;
    try {
      this.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  format(content: string): string {
    return content.trim();
  }

  minify(content: string): string {
    if (content.trim() === '') return '';
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');
  }

  parse(content: string): unknown {
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = this.parseCsvLine(lines[0]);
    if (lines.length === 1) return [headers];

    return lines.slice(1).map((line) => {
      const values = this.parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] ?? '';
      });
      return row;
    });
  }

  stringify(data: unknown): string {
    try {
      return jsonToCsv(data as Parameters<typeof jsonToCsv>[0]);
    } catch {
      return String(data);
    }
  }

  getColorRules(): ColorRule[] {
    return [
      {
        name: 'header',
        pattern: '^[^\\n]+',
        color: 'var(--color-accent)',
        fontWeight: 'var(--weight-semibold)',
        description: 'CSV header row',
      },
      {
        name: 'string',
        pattern: '"(?:[^"\\\\]|\\\\.)*"',
        color: 'var(--color-json-string)',
        description: 'Quoted CSV value',
      },
    ];
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
      i++;
    }
    result.push(current);
    return result;
  }
}
