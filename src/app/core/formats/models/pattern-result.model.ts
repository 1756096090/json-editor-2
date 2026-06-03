import { ColorRule } from './color-rule.model';

export interface PatternResult {
  type: string;
  value: string;
  startIndex: number;
  endIndex: number;
  colorRule: ColorRule;
}
