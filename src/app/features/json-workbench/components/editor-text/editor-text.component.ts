/**
 * editor-text.component.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps a single Monaco Editor instance for JSON editing.
 * Features: syntax highlighting, Ctrl+F find, error markers, jumpTo position.
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MonacoLoaderService, type MonacoNamespace } from '../../../../core/monaco-loader.service';
import type { JsonErrorPosition } from '../../../../core/json-error.utils';
import type { DiffLineDecoration } from '../../utils/diff-engine.types';
import type * as monacoNs from 'monaco-editor';

@Component({
  selector: 'app-editor-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #editorContainer class="editor-text-container" role="textbox" aria-multiline="true" [attr.aria-label]="ariaLabel()"></div>`,
  styles: `
    :host { display: block; height: 100%; width: 100%; }
    .editor-text-container { height: 100%; width: 100%; }
  `,
})
export class EditorTextComponent implements OnInit {
  /** Current text content of the editor. */
  readonly value = input<string>('');
  /** Whether this editor is read-only. */
  readonly readOnly = input<boolean>(false);
  /** Monaco language identifier (e.g. 'json', 'yaml', 'plaintext'). */
  readonly language = input<string>('json');
  /** Theme: 'dark' or 'light' — maps to custom Monaco themes. */
  readonly theme = input<'dark' | 'light'>('dark');
  /** Error position to highlight inline. Null = no error. */
  readonly errorPosition = input<JsonErrorPosition | null>(null);
  /** Whether this panel is the active (focused) one. */
  readonly isActive = input<boolean>(false);
  /** Aria label for accessibility. */
  readonly ariaLabel = input<string>('JSON editor');
  /** Diff line decorations to overlay (empty = no diff highlights). */
  readonly diffDecorations = input<DiffLineDecoration[]>([]);

  /** Emitted when the user edits the text. */
  readonly valueChange = output<string>();
  /** Emitted when this editor receives focus. */
  readonly focused = output<void>();
  /** Emitted on paste with the pasted text. */
  readonly pasted = output<string>();

  private readonly containerRef = viewChild.required<ElementRef<HTMLElement>>('editorContainer');
  private readonly loader = inject(MonacoLoaderService);
  private readonly destroyRef = inject(DestroyRef);

  private monaco: MonacoNamespace | null = null;
  private editor: monacoNs.editor.IStandaloneCodeEditor | null = null;
  private ignoreNextChange = false;
  private decorationIds: string[] = [];
  private diffDecorationIds: string[] = [];

  readonly ready = signal(false);

  private readonly monacoTheme = computed(() =>
    this.theme() === 'dark' ? 'json-we-dark' : 'json-we-light'
  );

  constructor() {
    // React to external value changes
    effect(() => {
      const val = this.value();
      console.log('[EditorText] value effect triggered, new value length:', val.length, 'editor exists:', !!this.editor);
      if (!this.editor) {
        console.log('[EditorText] Editor not ready yet, skipping value update');
        return;
      }
      const model = this.editor.getModel();
      if (model && model.getValue() !== val) {
        console.log('[EditorText] Updating editor model with new value');
        this.ignoreNextChange = true;
        model.setValue(val);
        this.ignoreNextChange = false;
      }
    });

    // React to theme changes
    effect(() => {
      const t = this.monacoTheme();
      if (this.monaco) {
        this.monaco.editor.setTheme(t);
      }
    });

    // React to readOnly changes
    effect(() => {
      const ro = this.readOnly();
      this.editor?.updateOptions({ readOnly: ro });
    });

    // React to language changes — swap Monaco model language on the fly
    effect(() => {
      const lang = this.language();
      if (this.editor && this.monaco) {
        const model = this.editor.getModel();
        if (model) {
          this.monaco.editor.setModelLanguage(model, lang);
        }
      }
    });

    // React to error position changes → set/clear markers
    effect(() => {
      const err = this.errorPosition();
      this.updateErrorMarkers(err);
    });

    // React to diff decoration changes
    effect(() => {
      const decos = this.diffDecorations();
      this.applyDiffDecorations(decos);
    });
  }

  ngOnInit(): void {
    console.log('[EditorText] ngOnInit, initial value:', this.value(), 'language:', this.language(), 'readOnly:', this.readOnly());
    this.loader.load().then((monaco) => {
      console.log('[EditorText] Monaco loaded');
      this.monaco = monaco;
      this.createEditor(monaco);
      this.ready.set(true);
      console.log('[EditorText] Editor created, setting initial value from signal');
    });

    this.destroyRef.onDestroy(() => {
      this.editor?.dispose();
    });
  }

  // ── Public API ───────────────────────────────────────────────────────

  /** Open the built-in Find Widget (Ctrl+F). */
  openFind(): void {
    this.editor?.getAction('actions.find')?.run();
  }

  /** Scroll to and highlight a specific line/column. */
  jumpTo(line: number, column: number): void {
    if (!this.editor) return;
    this.editor.revealPositionInCenter({ lineNumber: line, column });
    this.editor.setPosition({ lineNumber: line, column });
    this.editor.focus();
  }

  /** Focus the editor. */
  focusEditor(): void {
    this.editor?.focus();
  }

  /** Get the underlying Monaco editor instance (for diff, etc.). */
  getEditorInstance(): monacoNs.editor.IStandaloneCodeEditor | null {
    return this.editor;
  }

  /** Get the Monaco namespace. */
  getMonaco(): MonacoNamespace | null {
    return this.monaco;
  }

  // ── Private ──────────────────────────────────────────────────────────

  private createEditor(monaco: MonacoNamespace): void {
    const container = this.containerRef().nativeElement;

    this.editor = monaco.editor.create(container, {
      value: this.value(),
      language: this.language(),
      theme: this.monacoTheme(),
      readOnly: this.readOnly(),
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      scrollBeyondLastLine: false,
      tabSize: 2,
      bracketPairColorization: { enabled: true },
      matchBrackets: 'always',
      wordWrap: 'off',
      smoothScrolling: true,
      mouseWheelZoom: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      formatOnPaste: false,
      folding: true,
      glyphMargin: true,
      fixedOverflowWidgets: true,
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
      },
    });

    // Listen for content changes
    this.editor.onDidChangeModelContent(() => {
      if (this.ignoreNextChange) return;
      const model = this.editor?.getModel();
      if (model) {
        this.valueChange.emit(model.getValue());
      }
    });

    // Listen for focus
    this.editor.onDidFocusEditorWidget(() => {
      this.focused.emit();
    });

    // Listen for paste events
    this.editor.onDidPaste((e) => {
      const model = this.editor?.getModel();
      if (model) {
        const pastedText = model.getValueInRange(e.range);
        if (pastedText) {
          this.pasted.emit(pastedText);
        }
      }
    });

    // Initial error markers if any
    this.updateErrorMarkers(this.errorPosition());
  }

  private updateErrorMarkers(err: JsonErrorPosition | null): void {
    if (!this.monaco || !this.editor) return;
    const model = this.editor.getModel();
    if (!model) return;

    if (!err) {
      this.monaco.editor.setModelMarkers(model, 'json-validation', []);
      this.clearErrorDecorations();
      return;
    }

    const { line, column, message } = err;
    const endColumn = Math.min(column + 10, (model.getLineContent(line)?.length ?? column) + 1);

    this.monaco.editor.setModelMarkers(model, 'json-validation', [
      {
        severity: this.monaco.MarkerSeverity.Error,
        message,
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn,
      },
    ]);

    // Add inline decoration for the error line
    this.decorationIds = this.editor.deltaDecorations(this.decorationIds, [
      {
        range: {
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'monaco-error-line',
          glyphMarginClassName: 'monaco-error-glyph',
        },
      },
    ]);
  }

  private clearErrorDecorations(): void {
    if (this.editor && this.decorationIds.length) {
      this.decorationIds = this.editor.deltaDecorations(this.decorationIds, []);
    }
  }

  private applyDiffDecorations(decos: DiffLineDecoration[]): void {
    if (!this.editor) return;

    if (decos.length === 0) {
      if (this.diffDecorationIds.length) {
        this.diffDecorationIds = this.editor.deltaDecorations(this.diffDecorationIds, []);
      }
      return;
    }

    const monacoDecos: monacoNs.editor.IModelDeltaDecoration[] = decos.map(d => {
      const cssClass =
        d.kind === 'added'   ? 'diff-line--added' :
        d.kind === 'removed' ? 'diff-line--removed' :
                               'diff-line--modified';
      const glyphClass =
        d.kind === 'added'   ? 'diff-glyph--added' :
        d.kind === 'removed' ? 'diff-glyph--removed' :
                               'diff-glyph--modified';
      return {
        range: {
          startLineNumber: d.lineNumber,
          startColumn: 1,
          endLineNumber: d.lineNumber,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: cssClass,
          glyphMarginClassName: glyphClass,
        },
      };
    });

    this.diffDecorationIds = this.editor.deltaDecorations(this.diffDecorationIds, monacoDecos);
  }
}
