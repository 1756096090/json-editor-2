export interface ColorRule {
  name: string;
  /** Regex source string without flags. Used to build combined highlight patterns. */
  pattern: string;
  color: string;
  fontWeight?: string;
  description?: string;
}
