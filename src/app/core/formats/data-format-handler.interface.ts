import { ColorRule } from './models/color-rule.model';
import { PatternResult } from './models/pattern-result.model';
import type { AutoFixResult } from '../../features/json-workbench/utils/auto-fix-json';

export interface DataFormatHandler {
  readonly name: string;
  readonly extension: string;
  readonly mimeType: string;

  validate(content: string): boolean;
  format(content: string): string;
  minify(content: string): string;
  parse(content: string): unknown;
  stringify(data: unknown): string;

  getErrors(content: string): string[];
  detectPatterns(content: string): PatternResult[];
  getColorRules(): ColorRule[];

  /** Optional: attempt to repair malformed content. */
  autoFix?(content: string): AutoFixResult;
}
