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

interface SelectionToolbarPosition {
  left: number;
  top: number;
}

type CaseTransform =
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'upper-snake'
  | 'kebab'
  | 'flat'
  | 'train';

@Component({
  selector: 'app-editor-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor-text.component.html',
  styleUrl: './editor-text.component.css',
  host: {
    '[attr.aria-label]': 'ariaLabel()',
    'role': 'region',
  },
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
  /** Emitted (debounced) with the cursor's character offset in the model. */
  readonly cursorOffsetChange = output<number>();

  private readonly containerRef = viewChild.required<ElementRef<HTMLElement>>('editorContainer');
  private readonly loader = inject(MonacoLoaderService);
  private readonly destroyRef = inject(DestroyRef);

  private monaco: MonacoNamespace | null = null;
  private editor: monacoNs.editor.IStandaloneCodeEditor | null = null;
  private ignoreNextChange = false;
  private decorationIds: string[] = [];
  private diffDecorationIds: string[] = [];
  private cursorOffsetTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private layoutRafId: number | null = null;

  public readonly ready = signal(false);
  public readonly selectionToolbarPosition = signal<SelectionToolbarPosition | null>(null);

  private readonly monacoTheme = computed(() =>
    this.theme() === 'dark' ? 'json-we-dark' : 'json-we-light'
  );

  constructor() {
    // React to external value changes — but only if editor is ready
    effect(() => {
      const isReady = this.ready();
      const val = this.value();
      if (!isReady || !this.editor) return;
      const model = this.editor.getModel();
      if (model && model.getValue() !== val) {
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
    console.info('[Monaco diagnostics] Starting editor load', {
      editor: this.ariaLabel(),
      language: this.language(),
      theme: this.monacoTheme(),
      documentReadyState: document.readyState,
    });

    void this.loader.load()
      .then((monaco) => {
        console.info('[Monaco diagnostics] Module loaded', { editor: this.ariaLabel() });
        this.monaco = monaco;
        this.createEditor(monaco);
        this.ready.set(true);
      })
      .catch((error: unknown) => {
        console.error('[Monaco diagnostics] Module or editor creation failed', {
          editor: this.ariaLabel(),
          error,
        });
      });

    this.destroyRef.onDestroy(() => {
      if (this.cursorOffsetTimer !== null) clearTimeout(this.cursorOffsetTimer);
      if (this.layoutRafId !== null) cancelAnimationFrame(this.layoutRafId);
      this.resizeObserver?.disconnect();
      this.editor?.dispose();
      this.editor = null;
    });
  }

  private scheduleCursorOffset(position: monacoNs.Position): void {
    if (this.cursorOffsetTimer !== null) clearTimeout(this.cursorOffsetTimer);
    this.cursorOffsetTimer = setTimeout(() => {
      const model = this.editor?.getModel();
      if (model) this.cursorOffsetChange.emit(model.getOffsetAt(position));
    }, 120);
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

  /** Transform the selected text. Returns false when there is no editable selection. */
  transformSelection(transform: (selectedText: string) => string): boolean {
    if (!this.editor || this.readOnly()) return false;
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();
    if (!model || !selection || selection.isEmpty()) return false;

    const selectedText = model.getValueInRange(selection);
    const replacement = transform(selectedText);
    this.editor.executeEdits('selection-transform', [
      {
        range: selection,
        text: replacement,
        forceMoveMarkers: true,
      },
    ]);
    this.editor.focus();
    this.selectionToolbarPosition.set(null);
    return true;
  }

  onCaseTransformSelected(value: string): void {
    if (!value) return;
    this.transformSelection((selectedText) => transformCase(selectedText, value as CaseTransform));
  }

  public getSelectionToolbarPosition(): SelectionToolbarPosition | null {
    return this.selectionToolbarPosition();
  }

  /** Get the underlying Monaco editor instance (for diff, etc.). */
  getEditorInstance(): monacoNs.editor.IStandaloneCodeEditor | null {
    return this.editor;
  }

  /** Get the Monaco namespace. */
  getMonaco(): MonacoNamespace | null {
    return this.monaco;
  }

  /** Force Monaco to recalculate layout from the container's current bounding rect.
   *  Call this after programmatic visibility or size changes (tab switch, compare toggle). */
  refreshLayout(): void {
    if (!this.editor) return;
    const container = this.containerRef().nativeElement;
    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    if (width > 0 && height > 0) {
      this.editor.layout({ width, height });
    }
  }

  // ── Private ──────────────────────────────────────────────────────────

  private createEditor(monaco: MonacoNamespace): void {
    const container = this.containerRef().nativeElement;

    this.editor = monaco.editor.create(container, {
      value: this.value(),
      language: this.language(),
      theme: this.monacoTheme(),
      readOnly: this.readOnly(),
      automaticLayout: false,
      minimap: { enabled: false },
      glyphMargin: false,
      folding: false,
      lineNumbers: 'on',
      lineNumbersMinChars: 2,
      lineDecorationsWidth: 0,
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      stickyScroll: { enabled: false },
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontLigatures: true,
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
      fixedOverflowWidgets: true,
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
      },
    });

    // ResizeObserver: recalculate Monaco layout whenever the container changes size.
    // This handles split-pane drags, tab switches, compare toggles, and window resizes
    // more reliably than Monaco's internal automaticLayout polling.
    this.resizeObserver = new ResizeObserver(() => {
      if (this.layoutRafId !== null) cancelAnimationFrame(this.layoutRafId);
      this.layoutRafId = requestAnimationFrame(() => {
        this.layoutRafId = null;
        this.refreshLayout();
      });
    });
    this.resizeObserver.observe(container);

    // Staggered layout calls: RAF + timeouts cover deferred CSS, font loading, and
    // flex containers that settle asynchronously after the first paint.
    requestAnimationFrame(() => {
      this.refreshLayout();
      this.logEditorDiagnostics('first animation frame');
    });
    setTimeout(() => this.refreshLayout(), 50);
    setTimeout(() => this.refreshLayout(), 150);
    setTimeout(() => {
      this.refreshLayout();
      this.logEditorDiagnostics('after 300 ms');
    }, 300);

    // Listen for content changes
    this.editor.onDidChangeModelContent(() => {
      if (this.ignoreNextChange) return;
      const model = this.editor?.getModel();
      if (model) {
        this.valueChange.emit(model.getValue());
      }
    });

    this.editor.onDidChangeCursorSelection(() => {
      this.updateSelectionToolbarPosition();
    });

    // Debounced cursor offset — keeps path inspection cheap on large documents
    this.editor.onDidChangeCursorPosition((e) => {
      this.scheduleCursorOffset(e.position);
    });

    this.editor.onDidScrollChange(() => {
      this.updateSelectionToolbarPosition();
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

  /**
   * Reports the DOM and CSS information needed to diagnose Monaco production builds.
   * It intentionally does not log the editor value, pasted data, or model contents.
   */
  private logEditorDiagnostics(stage: string): void {
    if (!this.editor) return;

    const container = this.containerRef().nativeElement;
    const margin = container.querySelector<HTMLElement>('.monaco-editor .margin');
    const marginOverlays = container.querySelector<HTMLElement>(
      '.monaco-editor .margin-view-overlays'
    );
    const lineNumber = container.querySelector<HTMLElement>(
      '.monaco-editor .margin-view-overlays .line-numbers'
    );
    const viewLines = container.querySelector<HTMLElement>('.monaco-editor .view-lines');
    const containerRect = container.getBoundingClientRect();
    const layout = this.editor.getLayoutInfo();
    const structuralCssLoaded = this.hasMonacoStructuralCss();

    console.groupCollapsed(
      `[Monaco diagnostics] ${this.ariaLabel()} — ${stage}`
    );
    console.info('Environment', {
      url: window.location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      documentReadyState: document.readyState,
    });
    console.info('Container and Monaco layout', {
      container: {
        width: containerRect.width,
        height: containerRect.height,
        top: containerRect.top,
        left: containerRect.left,
      },
      editor: {
        width: layout.width,
        height: layout.height,
        glyphMarginWidth: layout.glyphMarginWidth,
        lineNumbersLeft: layout.lineNumbersLeft,
        lineNumbersWidth: layout.lineNumbersWidth,
        decorationsWidth: layout.decorationsWidth,
        contentLeft: layout.contentLeft,
      },
    });
    console.info('Monaco structural CSS', {
      loaded: structuralCssLoaded,
      styleSheets: Array.from(document.styleSheets, (sheet) => sheet.href ?? '[inline]'),
    });
    console.info('Computed DOM styles', {
      margin: this.getDiagnosticStyles(margin),
      marginOverlays: this.getDiagnosticStyles(marginOverlays),
      lineNumber: this.getDiagnosticStyles(lineNumber),
      viewLines: this.getDiagnosticStyles(viewLines),
    });

    if (!structuralCssLoaded) {
      console.error(
        '[Monaco diagnostics] Structural CSS is missing. Expected the selector "' +
          '.monaco-editor .margin-view-overlays .line-numbers".'
      );
    } else if (!lineNumber) {
      console.warn('[Monaco diagnostics] CSS is present, but Monaco rendered no line-number node.');
    } else {
      const styles = getComputedStyle(lineNumber);
      if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
        console.error('[Monaco diagnostics] The line-number node exists but is hidden.', {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
        });
      }
    }
    console.groupEnd();
  }

  private hasMonacoStructuralCss(): boolean {
    const expectedSelector = '.monaco-editor .margin-view-overlays .line-numbers';

    for (const styleSheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(styleSheet.cssRules)) {
          if (rule.cssText.includes(expectedSelector)) return true;
        }
      } catch {
        // Cross-origin stylesheets cannot expose cssRules; they are unrelated to Monaco.
      }
    }

    return false;
  }

  private getDiagnosticStyles(element: HTMLElement | null): Record<string, string> | null {
    if (!element) return null;
    const styles = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return {
      display: styles.display,
      position: styles.position,
      visibility: styles.visibility,
      opacity: styles.opacity,
      boxSizing: styles.boxSizing,
      top: styles.top,
      left: styles.left,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    };
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

  private updateSelectionToolbarPosition(): void {
    if (!this.editor || this.readOnly()) {
      this.selectionToolbarPosition.set(null);
      return;
    }

    const selection = this.editor.getSelection();
    if (!selection || selection.isEmpty()) {
      this.selectionToolbarPosition.set(null);
      return;
    }

    const start = this.editor.getScrolledVisiblePosition(selection.getStartPosition());
    const end = this.editor.getScrolledVisiblePosition(selection.getEndPosition());
    const layout = this.editor.getLayoutInfo();
    if (!start || !end) {
      this.selectionToolbarPosition.set(null);
      return;
    }

    const TOOLBAR_WIDTH = 190;
    const TOOLBAR_HEIGHT = 32;
    const GAP = 8;
    const lineHeight = start.height || 18;

    // Prefer floating above the selection's first line; if there's no room,
    // drop below the selection's last line so the toolbar never covers the text.
    const roomAbove = start.top - TOOLBAR_HEIGHT - GAP >= 0;
    const top = roomAbove
      ? start.top - TOOLBAR_HEIGHT - GAP
      : end.top + lineHeight + GAP;

    const anchorLeft = roomAbove ? start.left : end.left;
    const maxLeft = Math.max(layout.width - TOOLBAR_WIDTH - GAP, GAP);
    const maxTop = Math.max(layout.height - TOOLBAR_HEIGHT - GAP, GAP);

    this.selectionToolbarPosition.set({
      left: Math.min(Math.max(anchorLeft, GAP), maxLeft),
      top: Math.min(Math.max(top, GAP), maxTop),
    });
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

function transformCase(value: string, transform: CaseTransform): string {
  const words = getCaseWords(value);
  if (words.length === 0) return value;

  switch (transform) {
    case 'camel':
      return joinCamel(words, false);
    case 'pascal':
      return joinCamel(words, true);
    case 'snake':
      return words.map((word) => word.toLowerCase()).join('_');
    case 'upper-snake':
      return words.map((word) => word.toUpperCase()).join('_');
    case 'kebab':
      return words.map((word) => word.toLowerCase()).join('-');
    case 'flat':
      return words.map((word) => word.toLowerCase()).join('');
    case 'train':
      return words.map(capitalize).join('-');
  }
}

function getCaseWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

function joinCamel(words: string[], pascal: boolean): string {
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 && !pascal ? lower : capitalize(lower);
    })
    .join('');
}

function capitalize(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
