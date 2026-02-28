import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { format, minify } from '../../../core/json.utils';
import { StorageService } from '../../../core/storage.service';

@Component({
  selector: 'app-json-raw-editor',
  standalone: true,
  templateUrl: './json-raw-editor.component.html',
  styleUrl: './json-raw-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonRawEditorComponent implements OnInit {
  readonly value = input<string>('');
  readonly valueChange = output<string>();
  readonly formatShortcut = output<void>();
  readonly downloadShortcut = output<void>();
  readonly fileLoadError = output<string>();

  @ViewChild('editor', { static: true }) private editorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput', { static: true }) private fileInputRef?: ElementRef<HTMLInputElement>;

  readonly dragActive = signal(false);

  private readonly storageService = inject(StorageService);

  ngOnInit(): void {
    const draft = this.storageService.loadDraft();
    if (draft) {
      this.valueChange.emit(draft);
    }
  }

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.emitValue(target.value);
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files?.item(0);

    if (!file) {
      return;
    }

    void this.loadFile(file);
  }

  onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.item(0);
    inputElement.value = '';

    if (!file) {
      return;
    }

    void this.loadFile(file);
  }

  openFilePicker(): void {
    this.fileInputRef?.nativeElement.click();
  }

  applyFormat(): string | null {
    return this.applyTransform(format);
  }

  applyMinify(): string | null {
    return this.applyTransform(minify);
  }

  insertTextAtCursor(text: string): void {
    const textarea = this.editorRef?.nativeElement;
    if (!textarea) {
      this.emitValue(text);
      return;
    }

    const currentValue = this.value();
    const selectionStart = textarea.selectionStart ?? currentValue.length;
    const selectionEnd = textarea.selectionEnd ?? currentValue.length;
    const nextValue =
      currentValue.slice(0, selectionStart) + text + currentValue.slice(selectionEnd);
    const nextCaret = selectionStart + text.length;

    this.emitValue(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent): void {
    const hasCommand = event.ctrlKey || event.metaKey;
    if (!hasCommand) {
      return;
    }

    const key = event.key.toLowerCase();
    if (event.shiftKey && key === 'f') {
      event.preventDefault();
      this.formatShortcut.emit(undefined);
      return;
    }

    if (key === 's') {
      event.preventDefault();
      this.downloadShortcut.emit(undefined);
    }
  }

  private applyTransform(transformer: (value: string) => string): string | null {
    try {
      const textarea = this.editorRef?.nativeElement;
      const sourceValue = textarea?.value ?? this.value();
      const selectionStart = textarea?.selectionStart ?? null;
      const selectionEnd = textarea?.selectionEnd ?? null;
      const scrollTop = textarea?.scrollTop ?? null;
      const scrollLeft = textarea?.scrollLeft ?? null;

      const nextValue = transformer(sourceValue);
      this.emitValue(nextValue);

      if (textarea) {
        requestAnimationFrame(() => {
          textarea.focus();
          if (selectionStart !== null && selectionEnd !== null) {
            const nextStart = Math.min(selectionStart, nextValue.length);
            const nextEnd = Math.min(selectionEnd, nextValue.length);
            textarea.setSelectionRange(nextStart, nextEnd);
          }

          if (scrollTop !== null) {
            textarea.scrollTop = scrollTop;
          }

          if (scrollLeft !== null) {
            textarea.scrollLeft = scrollLeft;
          }
        });
      }

      return null;
    } catch (error) {
      return this.toErrorMessage(error);
    }
  }

  private async loadFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.fileLoadError.emit('Solo se permiten archivos con extension .json.');
      return;
    }

    try {
      const content = await this.readFile(file);
      this.emitValue(content);
    } catch (error) {
      this.fileLoadError.emit(`No se pudo leer el archivo: ${this.toErrorMessage(error)}`);
    }
  }

  private readFile(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onerror = () => {
          reject(reader.error ?? new Error('Error desconocido de FileReader'));
        };
        reader.onload = () => {
          if (typeof reader.result !== 'string') {
            resolve('');
            return;
          }

          resolve(reader.result);
        };
        reader.readAsText(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  private emitValue(nextValue: string): void {
    this.valueChange.emit(nextValue);
    this.storageService.saveDraft(nextValue);
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Error desconocido';
  }
}
