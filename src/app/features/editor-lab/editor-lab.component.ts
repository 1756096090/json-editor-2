import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { EditorLabPaneComponent } from './components/editor-lab-pane/editor-lab-pane.component';
import { DataFormatHandler } from '../../core/formats/data-format-handler.interface';
import { FormatRegistryService } from '../../core/formats/format-registry.service';
import { SegmentItem } from '../../components/ui/segmented-control/segmented-control.component';
import { StorageService } from '../../core/storage.service';

const INITIAL_INPUT_JSON = '';

const INITIAL_OUTPUT_JSON = '';

@Component({
  selector: 'app-editor-lab',
  imports: [EditorLabPaneComponent],
  templateUrl: './editor-lab.component.html',
  styleUrl: './editor-lab.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorLabComponent {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly formatRegistry = inject(FormatRegistryService);
  private readonly storage = inject(StorageService);

  private readonly STORAGE_KEY_INPUT_FORMAT = 'json-we-format:editor-lab:input-format';
  private readonly STORAGE_KEY_OUTPUT_FORMAT = 'json-we-format:editor-lab:output-format';

  private readonly inputPane = 'input' as const;
  private readonly outputPane = 'output' as const;

  readonly inputText = signal(INITIAL_INPUT_JSON);
  readonly outputText = signal(INITIAL_OUTPUT_JSON);

  readonly inputVersions = signal<string[]>([INITIAL_INPUT_JSON]);
  readonly outputVersions = signal<string[]>([INITIAL_OUTPUT_JSON]);
  readonly inputSelectedVersion = signal(0);
  readonly outputSelectedVersion = signal(0);
  readonly availableFormats = this.formatRegistry.getAvailableFormats();
  readonly formatItems: SegmentItem[] = this.availableFormats.map((f) => ({ value: f.name, label: f.name }));
  readonly defaultFormat = this.availableFormats[0]?.name ?? 'JSON';

  private resolveFormat(stored: string): string {
    return this.availableFormats.some((f) => f.name === stored) ? stored : this.defaultFormat;
  }

  readonly inputFormat = signal(this.resolveFormat(this.storage.read(this.STORAGE_KEY_INPUT_FORMAT)));
  readonly outputFormat = signal(this.resolveFormat(this.storage.read(this.STORAGE_KEY_OUTPUT_FORMAT)));

  readonly inputVersionFormats = signal<string[]>([this.inputFormat()]);
  readonly outputVersionFormats = signal<string[]>([this.outputFormat()]);

  readonly status = signal('');
  readonly activePane = signal<'input' | 'output'>(this.inputPane);

  private readonly inputHandler = computed<DataFormatHandler>(() =>
    this.formatRegistry.getFormatHandler(this.inputFormat())
  );
  private readonly outputHandler = computed<DataFormatHandler>(() =>
    this.formatRegistry.getFormatHandler(this.outputFormat())
  );

  readonly inputColorRules = computed(() => this.inputHandler().getColorRules());
  readonly outputColorRules = computed(() => this.outputHandler().getColorRules());

  readonly inputError = computed(() => this.getFormatError(this.inputText(), this.inputHandler()));
  readonly outputError = computed(() => this.getFormatError(this.outputText(), this.outputHandler()));

  constructor() {
    this.title.setTitle('Editor Lab | JSON Hunt');
    this.meta.updateTag({
      name: 'description',
      content: 'Minimal JSON editor sandbox for quick testing.',
    });
  }

  onInput(text: string): void {
    this.setInputText(text);
    this.activePane.set(this.inputPane);
  }

  onOutput(text: string): void {
    this.setOutputText(text);
    this.activePane.set(this.outputPane);
  }

  setActivePane(pane: 'input' | 'output'): void {
    this.activePane.set(pane);
  }

  onFormatChange(pane: 'input' | 'output', formatName: string): void {
    if (pane === this.inputPane) {
      this.inputFormat.set(formatName);
      this.storage.write(this.STORAGE_KEY_INPUT_FORMAT, formatName);
      this.inputVersionFormats.update((formats) =>
        this.replaceVersion(formats, this.inputSelectedVersion(), formatName)
      );
    } else {
      this.outputFormat.set(formatName);
      this.storage.write(this.STORAGE_KEY_OUTPUT_FORMAT, formatName);
      this.outputVersionFormats.update((formats) =>
        this.replaceVersion(formats, this.outputSelectedVersion(), formatName)
      );
    }
    this.status.set(`${pane === this.inputPane ? 'Input' : 'Output'} format changed to ${formatName}.`);
  }

  copyInputToOutput(): void {
    this.setOutputText(this.inputText());
    this.status.set('Input copied to Output.');
    this.activePane.set(this.outputPane);
  }

  saveInputVersion(): void {
    const currentFormat = this.inputFormat();
    this.inputVersions.update((versions) => [...versions, '']);
    this.inputVersionFormats.update((formats) => [...formats, currentFormat]);
    this.inputSelectedVersion.set(this.inputVersions().length - 1);
    this.inputText.set('');
    this.status.set('New Input version saved.');
  }

  saveOutputVersion(): void {
    const currentFormat = this.outputFormat();
    this.outputVersions.update((versions) => [...versions, '']);
    this.outputVersionFormats.update((formats) => [...formats, currentFormat]);
    this.outputSelectedVersion.set(this.outputVersions().length - 1);
    this.outputText.set('');
    this.status.set('New Output version saved.');
  }

  removeInputVersion(index: number): void {
    const versions = this.inputVersions();
    if (versions.length <= 1) return;
    if (index < 0 || index >= versions.length) return;

    const nextVersions = versions.filter((_, versionIndex) => versionIndex !== index);
    const nextFormats = this.inputVersionFormats().filter((_, i) => i !== index);
    const nextSelectedIndex = Math.min(this.inputSelectedVersion(), nextVersions.length - 1);

    this.inputVersions.set(nextVersions);
    this.inputVersionFormats.set(nextFormats);
    this.inputSelectedVersion.set(nextSelectedIndex);
    this.inputText.set(nextVersions[nextSelectedIndex] ?? '');
    const restoredFormat = nextFormats[nextSelectedIndex] ?? this.defaultFormat;
    this.inputFormat.set(restoredFormat);
    this.storage.write(this.STORAGE_KEY_INPUT_FORMAT, restoredFormat);
    this.status.set('Input version removed.');
  }

  removeOutputVersion(index: number): void {
    const versions = this.outputVersions();
    if (versions.length <= 1) return;
    if (index < 0 || index >= versions.length) return;

    const nextVersions = versions.filter((_, versionIndex) => versionIndex !== index);
    const nextFormats = this.outputVersionFormats().filter((_, i) => i !== index);
    const nextSelectedIndex = Math.min(this.outputSelectedVersion(), nextVersions.length - 1);

    this.outputVersions.set(nextVersions);
    this.outputVersionFormats.set(nextFormats);
    this.outputSelectedVersion.set(nextSelectedIndex);
    this.outputText.set(nextVersions[nextSelectedIndex] ?? '');
    const restoredFormat = nextFormats[nextSelectedIndex] ?? this.defaultFormat;
    this.outputFormat.set(restoredFormat);
    this.storage.write(this.STORAGE_KEY_OUTPUT_FORMAT, restoredFormat);
    this.status.set('Output version removed.');
  }

  selectInputVersion(index: number): void {
    const version = this.inputVersions()[index];
    if (version === undefined) return;

    this.inputSelectedVersion.set(index);
    this.inputText.set(version);
    const format = this.inputVersionFormats()[index] ?? this.defaultFormat;
    this.inputFormat.set(format);
    this.storage.write(this.STORAGE_KEY_INPUT_FORMAT, format);
    this.activePane.set(this.inputPane);
    this.status.set(`Input version ${index + 1} selected.`);
  }

  selectOutputVersion(index: number): void {
    const version = this.outputVersions()[index];
    if (version === undefined) return;

    this.outputSelectedVersion.set(index);
    this.outputText.set(version);
    const format = this.outputVersionFormats()[index] ?? this.defaultFormat;
    this.outputFormat.set(format);
    this.storage.write(this.STORAGE_KEY_OUTPUT_FORMAT, format);
    this.activePane.set(this.outputPane);
    this.status.set(`Output version ${index + 1} selected.`);
  }

  formatJson(): void {
    const isInput = this.activePane() === this.inputPane;
    const handler = isInput ? this.inputHandler() : this.outputHandler();
    const source = isInput ? this.inputText() : this.outputText();

    try {
      const formatted = handler.format(source);
      if (isInput) {
        this.setInputText(formatted);
        this.status.set(`Input formatted as ${handler.name}.`);
      } else {
        this.setOutputText(formatted);
        this.status.set(`Output formatted as ${handler.name}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid content';
      this.status.set(`Cannot format ${handler.name}: ${message}`);
    }
  }

  minifyJson(): void {
    const isInput = this.activePane() === this.inputPane;
    const handler = isInput ? this.inputHandler() : this.outputHandler();
    const source = isInput ? this.inputText() : this.outputText();

    try {
      const minified = handler.minify(source);
      if (isInput) {
        this.setInputText(minified);
        this.status.set(`Input minified as ${handler.name}.`);
      } else {
        this.setOutputText(minified);
        this.status.set(`Output minified as ${handler.name}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid content';
      this.status.set(`Cannot minify ${handler.name}: ${message}`);
    }
  }

  clearEditor(): void {
    if (this.activePane() === this.inputPane) {
      this.setInputText('');
      this.status.set('Input cleared.');
    } else {
      this.setOutputText('');
      this.status.set('Output cleared.');
    }
  }

  formatPane(pane: 'input' | 'output'): void {
    this.activePane.set(pane);
    this.formatJson();
  }

  minifyPane(pane: 'input' | 'output'): void {
    this.activePane.set(pane);
    this.minifyJson();
  }

  clearPane(pane: 'input' | 'output'): void {
    this.activePane.set(pane);
    this.clearEditor();
  }

  validatePane(pane: 'input' | 'output'): void {
    const handler = pane === this.inputPane ? this.inputHandler() : this.outputHandler();
    const error = pane === this.inputPane ? this.inputError() : this.outputError();
    const label = pane === this.inputPane ? 'Input' : 'Output';
    this.status.set(error ? `${label} error: ${error}` : `${label} is valid ${handler.name}.`);
  }

  private setInputText(text: string): void {
    this.inputText.set(text);
    this.inputVersions.update((versions) => this.replaceVersion(versions, this.inputSelectedVersion(), text));
  }

  private setOutputText(text: string): void {
    this.outputText.set(text);
    this.outputVersions.update((versions) => this.replaceVersion(versions, this.outputSelectedVersion(), text));
  }

  private replaceVersion(versions: string[], index: number, value: string): string[] {
    if (index < 0 || index >= versions.length) return versions;
    const next = versions.slice();
    next[index] = value;
    return next;
  }

  private getFormatError(value: string, handler: DataFormatHandler): string {
    if (value.trim() === '') {
      return '';
    }

    if (handler.validate(value)) {
      return '';
    }

    try {
      handler.parse(value);
      return `Invalid ${handler.name}`;
    } catch (error) {
      if (error instanceof Error && error.message.trim() !== '') {
        return error.message;
      }
      return `Invalid ${handler.name}`;
    }
  }

  getSelectedFormatName(): string {
    return this.inputHandler().name;
  }
}
