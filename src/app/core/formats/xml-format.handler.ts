import { Injectable } from '@angular/core';
import { BaseFormatHandler } from './base/base-format-handler';
import { ColorRule } from './models/color-rule.model';

@Injectable({ providedIn: 'root' })
export class XmlFormatHandler extends BaseFormatHandler {
  readonly name = 'XML';
  readonly extension = 'xml';
  readonly mimeType = 'application/xml';

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
    if (content.trim() === '') return '';
    const parsed = this.parse(content);
    if (!(parsed instanceof XMLDocument)) {
      throw new Error('Invalid XML data');
    }
    return this.prettyPrint(parsed);
  }

  minify(content: string): string {
    if (content.trim() === '') return '';
    return content.replace(/>\s+</g, '><').trim();
  }

  parse(content: string): unknown {
    const parser = new DOMParser();
    const xml = parser.parseFromString(content, 'application/xml');
    const parserError = xml.querySelector('parsererror');
    if (parserError) {
      throw new Error(parserError.textContent?.trim() || 'Invalid XML');
    }
    return xml;
  }

  stringify(data: unknown): string {
    if (data instanceof XMLDocument) {
      return new XMLSerializer().serializeToString(data);
    }
    if (data instanceof Element) {
      return new XMLSerializer().serializeToString(data);
    }
    throw new Error('Invalid XML data');
  }

  private prettyPrint(xml: XMLDocument): string {
    const root = xml.documentElement;
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

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const el = node as Element;
      const attrs = Array.from(el.attributes)
        .map((attr) => ` ${attr.name}=\"${attr.value}\"`)
        .join('');

      const childElements = Array.from(el.childNodes).filter(
        (child) => child.nodeType === Node.ELEMENT_NODE
      );
      const rawText = (el.textContent ?? '').trim();

      if (childElements.length === 0 && rawText !== '') {
        lines.push(`${indent}<${el.tagName}${attrs}>${rawText}</${el.tagName}>`);
        return;
      }

      if (el.childNodes.length === 0) {
        lines.push(`${indent}<${el.tagName}${attrs}/>`);
        return;
      }

      lines.push(`${indent}<${el.tagName}${attrs}>`);
      el.childNodes.forEach((child) => walk(child, depth + 1));
      lines.push(`${indent}</${el.tagName}>`);
    };

    walk(root, 0);
    return lines.join('\n');
  }

  getColorRules(): ColorRule[] {
    return [
      {
        name: 'comment',
        pattern: '<!--[\\s\\S]*?-->',
        color: 'var(--color-text-muted)',
        description: 'XML comment',
      },
      {
        name: 'tag',
        pattern: '<\\/?[\\w:.-]+',
        color: 'var(--color-accent)',
        fontWeight: 'var(--weight-semibold)',
        description: 'Tag name',
      },
      {
        name: 'attribute-value',
        pattern: '"[^"]*"',
        color: 'var(--color-json-string)',
        description: 'Attribute value',
      },
      {
        name: 'attribute-name',
        pattern: '[\\w:.-]+(?=\\s*=)',
        color: 'var(--color-json-boolean)',
        description: 'Attribute name',
      },
    ];
  }
}
