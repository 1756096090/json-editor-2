import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { JsonTreeViewComponent } from '../../../../components/ui/json-tree-view/json-tree-view.component';
import { JsonTableViewComponent } from '../../../../components/ui/json-table-view/json-table-view.component';
import { SegmentItem } from '../../../../components/ui/segmented-control/segmented-control.component';
import { EmptyStateComponent } from '../../../../components/ui/empty-state/empty-state.component';
import { LeftPanelMode } from '../../state/workbench.store';
import {
  AutoFixModalComponent,
  AutoFixModalResult,
} from '../../../../shared/auto-fix-modal/auto-fix-modal.component';
import { AutoFixSuccess, tryAutoFixJson } from '../../utils/auto-fix-json';
import { EditorTextComponent } from '../editor-text/editor-text.component';
import { InlineErrorBarComponent } from '../inline-error-bar/inline-error-bar.component';
import { ButtonComponent } from '../../../../components/ui/button/button.component';
import { ConvertedViewComponent } from '../converted-view/converted-view.component';
import type { JsonErrorPosition } from '../../../../core/json-error.utils';
import type { DiffLineDecoration } from '../../utils/diff-engine.types';
import { jsonToYaml } from '../../../tools/json-to-yaml/json-yaml.utils';
import { jsonToCsv, jsonToXml } from '../../utils/convert.utils';
import { downloadTextFile, copyTextToClipboard } from '../../utils/file-utils';

const VIEW_MODES: SegmentItem[] = [
  { value: 'text',  label: 'Text'  },
  { value: 'yaml',  label: 'YAML'  },
  { value: 'csv',   label: 'CSV'   },
  { value: 'xml',   label: 'XML'   },
  { value: 'tree',  label: 'Tree'  },
  { value: 'table', label: 'Table' },
];

@Component({
  selector: 'app-editor-panel',
  imports: [
    JsonTreeViewComponent,
    JsonTableViewComponent,
    EmptyStateComponent,
    AutoFixModalComponent,
    EditorTextComponent,
    InlineErrorBarComponent,
    ButtonComponent,
    ConvertedViewComponent,
  ],
  templateUrl: './editor-panel.component.html',
  styleUrl: './editor-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class EditorPanelComponent {
  // ── Inputs ─────────────────────────────────────────────────────────────────
  readonly rawText = input<string>('');
  readonly panelTitle = input<string>('Editor');
  readonly leftMode = input<LeftPanelMode>('text');
  readonly jsonValue = input<unknown>(null);
  readonly theme = input<'dark' | 'light'>('dark');
  readonly isActive = input<boolean>(false);

  // ── Error inputs ───────────────────────────────────────────────────────
  readonly errorPosition = input<JsonErrorPosition | null>(null);

  // ── AutoFix inputs ─────────────────────────────────────────────────────
  readonly autoFixEnabled = input<boolean>(true);
  readonly lastValidText = input<string>('');

  // ── Diff inputs ───────────────────────────────────────────────────────
  readonly diffDecorations = input<DiffLineDecoration[]>([]);

  // ── Derived validity (from parsed JSON value) ──────────────────────────
  readonly isValid = computed(() => this.jsonValue() !== null);

  /** True when the editor content is completely empty — shows drop/paste hint */
  readonly isEmpty = computed(() => this.rawText().trim() === '');

  // ── Outputs ────────────────────────────────────────────────────────────────
  readonly rawTextChange = output<string>();
  readonly fileDropped = output<File>();
  readonly modeChange = output<LeftPanelMode>();
  readonly focused = output<void>();
  readonly formatRequested = output<void>();
  readonly minifyRequested = output<void>();
  readonly copyRequested = output<void>();
  readonly textReverted = output<string>();

  // ── View children ──────────────────────────────────────────────────────────
  private readonly monacoEditor = viewChild<EditorTextComponent>('monacoEditor');

  // ── Local state ────────────────────────────────────────────────────────────
  readonly viewModes = VIEW_MODES;
  readonly draggingFile = signal(false);

  /** YAML representation of the current valid JSON. Empty when JSON is invalid. */
  readonly yamlText = computed(() => {
    const v = this.jsonValue();
    if (!v) {
      console.log('[YAML] jsonValue is null/undefined, returning empty');
      return '';
    }
    try {
      const result = jsonToYaml(v as any);
      console.log('[YAML] converted successfully, length:', result.length);
      return result;
    } catch (e) {
      console.error('[YAML] conversion error:', e);
      return '';
    }
  });

  /** CSV representation of the current valid JSON. */
  readonly csvText = computed(() => {
    const v = this.jsonValue();
    if (v === null || v === undefined) return '';
    try {
      return jsonToCsv(v as Parameters<typeof jsonToCsv>[0]);
    } catch (e) {
      console.error('[CSV] conversion error:', e);
      return '';
    }
  });

  /** XML representation of the current valid JSON. */
  readonly xmlText = computed(() => {
    const v = this.jsonValue();
    if (v === null || v === undefined) return '';
    try {
      return jsonToXml(v as Parameters<typeof jsonToXml>[0]);
    } catch (e) {
      console.error('[XML] conversion error:', e);
      return '';
    }
  });

  /** Indicates if there's valid JSON to convert to other formats. */
  readonly hasValidJsonForConversion = computed(() => {
    const v = this.jsonValue();
    return v !== null && v !== undefined;
  });

  /** Monaco language ID based on the current view mode. */
  readonly monacoLanguage = computed(() => {
    const m = this.leftMode();
    if (m === 'yaml') return 'yaml';
    if (m === 'xml')  return 'xml';
    return 'json';
  });

  private readonly exportConfig = {
    yaml: { fileName: 'output.yaml', mimeType: 'text/yaml' },
    csv: { fileName: 'output.csv', mimeType: 'text/csv' },
    xml: { fileName: 'output.xml', mimeType: 'application/xml' },
  } as const;

  /** Pending fix proposal for the accept-mode modal. Null = modal hidden. */
  readonly autoFixProposal = signal<AutoFixSuccess | null>(null);
  /** Error message for the failure-mode modal. Null = modal hidden. */
  readonly autoFixFailureMsg = signal<string | null>(null);
  /** Text that was just pasted — held for the accept-mode diff view. */
  protected pastedText = '';
  /** Text before the paste — used for revert. */
  private textBeforePaste = '';

  // ── Handlers ───────────────────────────────────────────────────────────────

  onValueChange(value: string): void {
    this.rawTextChange.emit(value);
  }

  onEditorFocused(): void {
    this.focused.emit();
  }

  onEditorPasted(pastedContent: string): void {
    if (!this.autoFixEnabled()) return;

    // Snapshot current text for potential revert
    this.textBeforePaste = this.rawText();
    // The full text already includes the paste (Monaco emits after applying)
    const fullText = this.monacoEditor()?.getEditorInstance()?.getModel()?.getValue() ?? '';
    this.pastedText = fullText;

    // Check if result is already valid JSON
    try {
      JSON.parse(fullText);
      return; // All good
    } catch (e) {
      const result = tryAutoFixJson(fullText);
      if (result.ok) {
        this.autoFixProposal.set(result);
      } else {
        const parseError =
          e instanceof SyntaxError ? e.message : 'JSON inválido';
        this.autoFixFailureMsg.set(parseError);
      }
    }
  }

  onAutoFixClosed(result: AutoFixModalResult): void {
    if (result.action === 'accept' && this.autoFixProposal()) {
      this.rawTextChange.emit(this.autoFixProposal()!.fixedText);
    } else if (result.action === 'revert') {
      const revertTo = this.lastValidText() || this.textBeforePaste;
      this.rawTextChange.emit(revertTo);
      this.textReverted.emit(revertTo);
    }
    this.autoFixProposal.set(null);
    this.autoFixFailureMsg.set(null);
  }

  onShowMePressed(): void {
    const err = this.errorPosition();
    if (!err) return;
    this.monacoEditor()?.jumpTo(err.line, err.column);
  }

  onRepairPressed(): void {
    const text = this.rawText();
    this.pastedText = text;
    this.textBeforePaste = text;

    let parseError = 'JSON inválido';
    try {
      JSON.parse(text);
    } catch (e) {
      if (e instanceof SyntaxError) parseError = e.message;
    }

    const result = tryAutoFixJson(text);
    if (result.ok) {
      this.autoFixProposal.set(result);
    } else {
      this.autoFixFailureMsg.set(parseError);
    }
  }

  /** Open Monaco's built-in Ctrl+F find widget. */
  openFind(): void {
    this.monacoEditor()?.openFind();
  }

  /** Jump to a specific line and column in the editor. */
  jumpTo(line: number, column: number): void {
    this.monacoEditor()?.jumpTo(line, column);
  }

  /** Focus the Monaco editor. */
  focusEditor(): void {
    this.monacoEditor()?.focusEditor();
  }

  setMode(mode: string): void {
    this.modeChange.emit(mode as LeftPanelMode);
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(true);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(false);
    const file = event.dataTransfer?.files?.item(0);
    if (!file) return;
    this.fileDropped.emit(file);
  }

  /** Copy: uses converted text for yaml/csv/xml modes, otherwise bubbles up. */
  handleCopy(): void {
    const mode = this.leftMode();
    if (mode === 'yaml') {
      void copyTextToClipboard(this.yamlText());
      return;
    }
    if (mode === 'csv') {
      void copyTextToClipboard(this.csvText());
      return;
    }
    if (mode === 'xml') {
      void copyTextToClipboard(this.xmlText());
      return;
    }
    this.copyRequested.emit();
  }

  /** Download the current view as a file in its native format. */
  exportCurrentView(): void {
    const mode = this.leftMode();
    if (mode === 'yaml') {
      const config = this.exportConfig.yaml;
      downloadTextFile(config.fileName, this.yamlText(), config.mimeType);
      return;
    }
    if (mode === 'csv') {
      const config = this.exportConfig.csv;
      downloadTextFile(config.fileName, this.csvText(), config.mimeType);
      return;
    }
    if (mode === 'xml') {
      const config = this.exportConfig.xml;
      downloadTextFile(config.fileName, this.xmlText(), config.mimeType);
      return;
    }
    downloadTextFile('output.json', this.rawText(), 'application/json');
  }
}

