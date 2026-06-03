export type EditorFormat = 'json' | 'xml';

export interface FormatExecutionResult {
  value: string;
  error: string;
}

export interface EditorFormatStrategy {
  readonly kind: EditorFormat;
  readonly label: string;
  validate(value: string): string;
  format(value: string): FormatExecutionResult;
}

abstract class BaseFormatStrategy implements EditorFormatStrategy {
  abstract readonly kind: EditorFormat;
  abstract readonly label: string;

  validate(value: string): string {
    if (value.trim() === '') return '';
    return this.validateNonEmpty(value);
  }

  format(value: string): FormatExecutionResult {
    if (value.trim() === '') {
      return { value: '', error: '' };
    }

    const error = this.validateNonEmpty(value);
    if (error) {
      return { value, error };
    }

    return { value: this.formatValid(value), error: '' };
  }

  protected abstract validateNonEmpty(value: string): string;
  protected abstract formatValid(value: string): string;
}

class JsonFormatStrategy extends BaseFormatStrategy {
  readonly kind: EditorFormat = 'json';
  readonly label = 'JSON';

  protected validateNonEmpty(value: string): string {
    try {
      JSON.parse(value);
      return '';
    } catch (error) {
      if (error instanceof SyntaxError) return error.message;
      return 'Invalid JSON';
    }
  }

  protected formatValid(value: string): string {
    return JSON.stringify(JSON.parse(value), null, 2);
  }
}

class XmlFormatStrategy extends BaseFormatStrategy {
  readonly kind: EditorFormat = 'xml';
  readonly label = 'XML';

  protected validateNonEmpty(value: string): string {
    const parsed = new DOMParser().parseFromString(value, 'application/xml');
    const errorNode = parsed.querySelector('parsererror');
    return errorNode?.textContent?.trim() ?? '';
  }

  protected formatValid(value: string): string {
    const parsed = new DOMParser().parseFromString(value, 'application/xml');
    return prettyPrintXml(parsed);
  }
}

function prettyPrintXml(documentNode: XMLDocument): string {
  const serializer = new XMLSerializer();
  const root = documentNode.documentElement;
  if (!root) return '';

  const lines: string[] = [];

  const walk = (node: Node, depth: number): void => {
    const indent = '  '.repeat(depth);

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? '';
      if (text) {
        lines.push(`${indent}${text}`);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as Element;
    const hasElementChildren = Array.from(element.childNodes).some(
      (child) => child.nodeType === Node.ELEMENT_NODE
    );
    const hasTextOnly =
      element.childNodes.length === 1 && element.firstChild?.nodeType === Node.TEXT_NODE;

    if (!hasElementChildren && !hasTextOnly) {
      lines.push(`${indent}${serializer.serializeToString(element)}`);
      return;
    }

    if (hasTextOnly) {
      const text = element.textContent?.trim() ?? '';
      lines.push(`${indent}<${element.tagName}>${text}</${element.tagName}>`);
      return;
    }

    const attrs = Array.from(element.attributes)
      .map((attr) => ` ${attr.name}="${attr.value}"`)
      .join('');
    lines.push(`${indent}<${element.tagName}${attrs}>`);

    element.childNodes.forEach((child) => walk(child, depth + 1));

    lines.push(`${indent}</${element.tagName}>`);
  };

  walk(root, 0);
  return lines.join('\n');
}

export const FORMAT_STRATEGIES: Record<EditorFormat, EditorFormatStrategy> = {
  json: new JsonFormatStrategy(),
  xml: new XmlFormatStrategy(),
};

export const AVAILABLE_FORMATS: Array<{ value: EditorFormat; label: string }> = [
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
];
