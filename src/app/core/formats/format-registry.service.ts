import { Injectable, inject } from '@angular/core';
import { DataFormatHandler } from './data-format-handler.interface';
import { JsonFormatHandler } from './json-format.handler';
import { XmlFormatHandler } from './xml-format.handler';
import { YamlFormatHandler } from './yaml-format.handler';
import { CsvFormatHandler } from './csv-format.handler';

@Injectable({ providedIn: 'root' })
export class FormatRegistryService {
  private readonly handlers = new Map<string, DataFormatHandler>();

  constructor() {
    this.registerFormat(inject(JsonFormatHandler));
    this.registerFormat(inject(XmlFormatHandler));
    this.registerFormat(inject(YamlFormatHandler));
    this.registerFormat(inject(CsvFormatHandler));
  }

  getAvailableFormats(): DataFormatHandler[] {
    return Array.from(this.handlers.values());
  }

  getFormatHandler(formatName: string): DataFormatHandler {
    const handler = this.handlers.get(formatName.toLowerCase());
    if (!handler) {
      throw new Error(`Format not registered: ${formatName}`);
    }
    return handler;
  }

  registerFormat(handler: DataFormatHandler): void {
    this.handlers.set(handler.name.toLowerCase(), handler);
  }
}
