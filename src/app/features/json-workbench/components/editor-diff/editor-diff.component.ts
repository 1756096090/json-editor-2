/**
 * editor-diff.component.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps Monaco's DiffEditor for a side-by-side or inline diff view.
 * Supports synced scrolling, "only diffs" mode, and diff navigation.
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MonacoLoaderService, type MonacoNamespace } from '../../../../core/monaco-loader.service';
import type * as monacoNs from 'monaco-editor';

@Component({
  selector: 'app-editor-diff',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #diffContainer class="editor-diff-container" role="region" aria-label="JSON diff view"></div>`,
  styles: `
    :host { display: block; height: 100%; width: 100%; }
    .editor-diff-container { height: 100%; width: 100%; }
  `,
})
export class EditorDiffComponent implements OnInit {
  /** Original (left/baseline) text. */
  readonly originalText = input<string>('');
  /** Modified (right/working) text. */
  readonly modifiedText = input<string>('');
  /** Theme: 'dark' or 'light'. */
  readonly theme = input<'dark' | 'light'>('dark');
  /** Whether to show side-by-side (false) or inline (true). */
  readonly inlineDiff = input<boolean>(false);

  /** Emitted when original text is changed (left editor). */
  readonly originalTextChange = output<string>();
  /** Emitted when modified text is changed (right editor). */
  readonly modifiedTextChange = output<string>();

  private readonly containerRef = viewChild.required<ElementRef<HTMLElement>>('diffContainer');
  private readonly loader = inject(MonacoLoaderService);
  private readonly destroyRef = inject(DestroyRef);

  private monaco: MonacoNamespace | null = null;
  private diffEditor: monacoNs.editor.IStandaloneDiffEditor | null = null;
  private ignoreOriginalChange = false;
  private ignoreModifiedChange = false;

  readonly ready = signal(false);

  constructor() {
    // React to external text changes
    effect(() => {
      const ot = this.originalText();
      if (!this.diffEditor || !this.monaco) return;
      const orig = this.diffEditor.getOriginalEditor().getModel();
      if (orig && orig.getValue() !== ot) {
        this.ignoreOriginalChange = true;
        orig.setValue(ot);
        this.ignoreOriginalChange = false;
      }
    });

    effect(() => {
      const mt = this.modifiedText();
      if (!this.diffEditor || !this.monaco) return;
      const mod = this.diffEditor.getModifiedEditor().getModel();
      if (mod && mod.getValue() !== mt) {
        this.ignoreModifiedChange = true;
        mod.setValue(mt);
        this.ignoreModifiedChange = false;
      }
    });

    // React to theme changes
    effect(() => {
      const t = this.theme() === 'dark' ? 'json-we-dark' : 'json-we-light';
      if (this.monaco) {
        this.monaco.editor.setTheme(t);
      }
    });

    // React to inline mode changes
    effect(() => {
      const inline = this.inlineDiff();
      this.diffEditor?.updateOptions({ renderSideBySide: !inline });
    });
  }

  ngOnInit(): void {
    this.loader.load().then((monaco) => {
      this.monaco = monaco;
      this.createDiffEditor(monaco);
      this.ready.set(true);
    });

    this.destroyRef.onDestroy(() => {
      this.diffEditor?.dispose();
    });
  }

  // ── Public API ───────────────────────────────────────────────────

  /** Navigate to the previous diff change. */
  goToPreviousChange(): void {
    const nav = this.diffEditor?.getModifiedEditor().getAction('editor.action.diffReview.prev');
    nav?.run();
  }

  /** Navigate to the next diff change. */
  goToNextChange(): void {
    const nav = this.diffEditor?.getModifiedEditor().getAction('editor.action.diffReview.next');
    nav?.run();
  }

  /** Get change count from the diff model. */
  getChanges(): monacoNs.editor.ILineChange[] {
    return this.diffEditor?.getLineChanges() ?? [];
  }

  // ── Private ─────────────────────────────────────────────────────

  private createDiffEditor(monaco: MonacoNamespace): void {
    const container = this.containerRef().nativeElement;
    const theme = this.theme() === 'dark' ? 'json-we-dark' : 'json-we-light';

    this.diffEditor = monaco.editor.createDiffEditor(container, {
      theme,
      automaticLayout: true,
      readOnly: false,
      renderSideBySide: !this.inlineDiff(),
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      fontLigatures: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      mouseWheelZoom: true,
      glyphMargin: true,
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
      },
      originalEditable: true,
      enableSplitViewResizing: true,
    });

    const originalModel = monaco.editor.createModel(this.originalText(), 'json');
    const modifiedModel = monaco.editor.createModel(this.modifiedText(), 'json');

    this.diffEditor.setModel({ original: originalModel, modified: modifiedModel });

    // Listen for content changes on the original editor
    originalModel.onDidChangeContent(() => {
      if (this.ignoreOriginalChange) return;
      this.originalTextChange.emit(originalModel.getValue());
    });

    // Listen for content changes on the modified editor
    modifiedModel.onDidChangeContent(() => {
      if (this.ignoreModifiedChange) return;
      this.modifiedTextChange.emit(modifiedModel.getValue());
    });
  }
}
