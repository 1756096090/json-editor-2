import { DataFormatHandler } from '../data-format-handler.interface';
import { ColorRule } from '../models/color-rule.model';
import { PatternResult } from '../models/pattern-result.model';

export abstract class BaseFormatHandler implements DataFormatHandler {
  abstract readonly name: string;
  abstract readonly extension: string;
  abstract readonly mimeType: string;

  abstract validate(content: string): boolean;
  abstract format(content: string): string;
  abstract minify(content: string): string;
  abstract parse(content: string): unknown;
  abstract stringify(data: unknown): string;
  abstract getColorRules(): ColorRule[];

  getErrors(content: string): string[] {
    if (content.trim() === '') return [];
    try {
      this.parse(content);
      return [];
    } catch (error) {
      return [error instanceof Error ? error.message : `Invalid ${this.name}`];
    }
  }

  detectPatterns(content: string): PatternResult[] {
    if (content.trim() === '') return [];
    const rules = this.getColorRules();
    const results: PatternResult[] = [];

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern, 'g');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        results.push({
          type: rule.name,
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          colorRule: rule,
        });
      }
    }

    return results.sort((a, b) => a.startIndex - b.startIndex);
  }
}
