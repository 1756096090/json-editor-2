import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  signal
} from '@angular/core';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { downloadBlob, format, minify, safeParse } from '../../core/json.utils';
import { JsonPreviewComponent } from './components/json-preview.component';
import { JsonRawEditorComponent } from './components/json-raw-editor.component';

@Component({
  selector: 'app-json-editor-page',
  standalone: true,
  imports: [ButtonComponent, JsonRawEditorComponent, JsonPreviewComponent],
  templateUrl: './json-editor-page.component.html',
  styleUrl: './json-editor-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonEditorPageComponent {
  @ViewChild(JsonRawEditorComponent) private rawEditor?: JsonRawEditorComponent;

  readonly code = signal('{\n  "app": "json-we-format"\n}');
  readonly valid = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly actionMessage = signal<string>('');

  private readonly parseResult = computed(() => safeParse(this.code()));
  readonly statusLabel = computed(() => (this.valid() ? 'JSON valido' : 'JSON invalido'));

  constructor() {
    effect(
      () => {
        const parsed = this.parseResult();
        this.valid.set(parsed.ok);
        this.error.set(parsed.ok ? '' : parsed.error.message);
      },
      { allowSignalWrites: true }
    );
  }

  onCodeChange(nextValue: string): void {
    this.code.set(nextValue);
  }

  formatCode(): void {
    const operationError = this.rawEditor?.applyFormat() ?? this.applyTransform(format);
    this.setAction(operationError ? `No se pudo formatear: ${operationError}` : 'JSON formateado.');
  }

  minifyCode(): void {
    const operationError = this.rawEditor?.applyMinify() ?? this.applyTransform(minify);
    this.setAction(operationError ? `No se pudo minimizar: ${operationError}` : 'JSON minimizado.');
  }

  async copyToClipboard(): Promise<void> {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API no disponible en este navegador.');
      }

      await navigator.clipboard.writeText(this.code());
      this.setAction('JSON copiado al portapapeles.');
    } catch (error) {
      this.setAction(`Error al copiar: ${this.toErrorMessage(error)}`);
    }
  }

  async pasteFromClipboard(): Promise<void> {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API no disponible en este navegador.');
      }

      const text = await navigator.clipboard.readText();
      this.rawEditor?.insertTextAtCursor(text);

      if (!this.rawEditor) {
        this.code.set(text);
      }

      this.setAction('Contenido pegado desde el portapapeles.');
    } catch (error) {
      this.setAction(`Error al pegar: ${this.toErrorMessage(error)}`);
    }
  }

  downloadPretty(): void {
    if (!this.valid()) {
      this.setAction('No se puede descargar pretty porque el JSON es invalido.');
      return;
    }

    try {
      downloadBlob('json-we-format.pretty.json', format(this.code()));
      this.setAction('Descarga pretty iniciada.');
    } catch (error) {
      this.setAction(`Error al descargar pretty: ${this.toErrorMessage(error)}`);
    }
  }

  downloadMinified(): void {
    if (!this.valid()) {
      this.setAction('No se puede descargar min porque el JSON es invalido.');
      return;
    }

    try {
      downloadBlob('json-we-format.min.json', minify(this.code()));
      this.setAction('Descarga min iniciada.');
    } catch (error) {
      this.setAction(`Error al descargar min: ${this.toErrorMessage(error)}`);
    }
  }

  openJsonFile(): void {
    this.rawEditor?.openFilePicker();
  }

  onFormatShortcut(): void {
    this.formatCode();
  }

  onDownloadShortcut(): void {
    this.downloadPretty();
  }

  onFileLoadError(message: string): void {
    this.setAction(message);
  }

  private applyTransform(transformer: (value: string) => string): string | null {
    try {
      this.code.set(transformer(this.code()));
      return null;
    } catch (error) {
      return this.toErrorMessage(error);
    }
  }

  private setAction(message: string): void {
    this.actionMessage.set(message);
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Error desconocido';
  }
}
