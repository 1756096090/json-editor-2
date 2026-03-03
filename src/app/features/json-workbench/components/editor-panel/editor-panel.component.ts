import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { JsonTreeViewComponent } from '../../../../components/ui/json-tree-view/json-tree-view.component';
import { JsonTableViewComponent } from '../../../../components/ui/json-table-view/json-table-view.component';
import { SegmentedControlComponent, SegmentItem } from '../../../../components/ui/segmented-control/segmented-control.component';
import { EmptyStateComponent } from '../../../../components/ui/empty-state/empty-state.component';
import { buildBracketHighlightHtml } from '../../utils/bracket-utils';
import { LeftPanelMode } from '../../state/workbench.store';
import type { SideBySideRow } from '../../utils/diff-engine';
import { AutoFixModalComponent, AutoFixModalResult } from '../../../../shared/auto-fix-modal/auto-fix-modal.component';
import { AutoFixSuccess, tryAutoFixJson } from '../../utils/auto-fix-json';

const VIEW_MODES: SegmentItem[] = [
  { value: 'text', label: 'Text' },
  { value: 'tree', label: 'Tree' },
  { value: 'table', label: 'Table' }
];

@Component({
  selector: 'app-editor-panel',
  imports: [
    JsonTreeViewComponent,
    JsonTableViewComponent,
    SegmentedControlComponent,
    EmptyStateComponent,
    AutoFixModalComponent
  ],
  templateUrl: './editor-panel.component.html',
  styleUrl: './editor-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class EditorPanelComponent {
  // ── Existing inputs ────────────────────────────────────────────────────────
  readonly rawText = input<string>('');
  readonly panelTitle = input<string>('RAW editor');
  readonly leftMode = input<LeftPanelMode>('text');
  readonly mismatchedIndexes = input<readonly number[]>([]);
  readonly jsonValue = input<unknown>(null);

  // ── Diff inputs ────────────────────────────────────────────────────────────
  readonly showDiff = input<boolean>(false);
  readonly diffSide = input<'left' | 'right'>('left');
  readonly diffRows = input<SideBySideRow[]>([]);
  readonly activeHunkStart = input<number>(-1);
  readonly activeHunkEnd = input<number>(-1);
  readonly showOnlyDiffs = input<boolean>(false);
  readonly syncScroll = input<boolean>(true);
  readonly externalScrollTop = input<number>(0);
  // ── Format-on-interaction inputs ────────────────────────────────────
  readonly formatOnAltClick  = input<boolean>(false);
  readonly formatOnBadgeClick = input<boolean>(false);
  // ── AutoFix-on-paste inputs ──────────────────────────────────────────
  readonly autoFixEnabled   = input<boolean>(true);
  /** Text to restore if user chooses to revert the paste. */
  readonly lastValidText    = input<string>('');

  // ── Derived validity (from parsed JSON value) ────────────────────────
  readonly isValid = computed(() => this.jsonValue() !== null);
  // ── Outputs ────────────────────────────────────────────────────────────────
  readonly rawTextChange = output<string>();
  readonly fileDropped = output<File>();
  readonly modeChange = output<LeftPanelMode>();
  readonly diffScrolled = output<number>();
  readonly formatRequested = output<void>();
  /** Emitted when the user chooses to revert the paste to `lastValidText`. */
  readonly textReverted = output<string>();
  // ── View children ──────────────────────────────────────────────────────────
  private readonly overlayRef = viewChild<ElementRef<HTMLElement>>('overlayRef');
  private readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textareaRef');
  private readonly diffBgRef = viewChild<ElementRef<HTMLElement>>('diffBgRef');
  private readonly diffGutterRef = viewChild<ElementRef<HTMLElement>>('diffGutterRef');

  // ── Local state ────────────────────────────────────────────────────────────
  readonly viewModes = VIEW_MODES;
  readonly draggingFile = signal(false);

  /** Pending fix proposal for the accept-mode modal. Null = modal hidden. */
  readonly autoFixProposal = signal<AutoFixSuccess | null>(null);
  /** Error message for the failure-mode modal. Null = modal hidden. */
  readonly autoFixFailureMsg = signal<string | null>(null);
  /** Text that was just pasted — held for the accept-mode diff view. */
  protected pastedText = '';
  /** Text before the paste — used for revert. */
  private textBeforePaste = '';

  private isSyncScrolling = false;

  // ── Computed ───────────────────────────────────────────────────────────────
  readonly highlightedHtml = computed(() =>
    buildBracketHighlightHtml(this.rawText(), this.mismatchedIndexes())
  );

  readonly mismatchCount = computed(() => this.mismatchedIndexes().length);

  /** Map from 1-based line number → combined diff kind for the current side. */
  private readonly diffLineKindMap = computed<Map<number, string>>(() => {
    const map = new Map<number, string>();
    if (!this.showDiff()) return map;
    const side = this.diffSide();
    for (const row of this.diffRows()) {
      const cell = side === 'left' ? row.left : row.right;
      if (cell.lineNumber === null) continue;
      if (cell.kind === 'removed') {
        map.set(cell.lineNumber, cell.modified ? 'modified-old' : 'removed');
      } else if (cell.kind === 'added') {
        map.set(cell.lineNumber, cell.modified ? 'modified-new' : 'added');
      }
    }
    return map;
  });

  /** Set of 1-based line numbers that belong to the currently active hunk. */
  private readonly activeHunkLineNumbers = computed<Set<number>>(() => {
    const start = this.activeHunkStart();
    const end = this.activeHunkEnd();
    if (start < 0) return new Set();
    const side = this.diffSide();
    const set = new Set<number>();
    const rows = this.diffRows();
    for (let i = start; i <= end && i < rows.length; i++) {
      const cell = side === 'left' ? rows[i].left : rows[i].right;
      if (cell.lineNumber !== null) set.add(cell.lineNumber);
    }
    return set;
  });

  /** Per-line data driving the bg-layer. */
  readonly diffBgLines = computed<Array<{ kind: string; active: boolean }>>(() => {
    if (!this.showDiff()) return [];
    const map = this.diffLineKindMap();
    const active = this.activeHunkLineNumbers();
    return this.rawText().split('\n').map((_, i) => ({
      kind: map.get(i + 1) ?? '',
      active: active.has(i + 1)
    }));
  });

  /** Per-line data driving the gutter. */
  readonly diffGutterLines = computed<Array<{ lineNum: number; kind: string; active: boolean }>>(() => {
    if (!this.showDiff()) return [];
    const map = this.diffLineKindMap();
    const active = this.activeHunkLineNumbers();
    return this.rawText().split('\n').map((_, i) => ({
      lineNum: i + 1,
      kind: map.get(i + 1) ?? '',
      active: active.has(i + 1)
    }));
  });

  constructor() {
    // Sync-scroll: apply external scroll position from the other panel
    effect(() => {
      const top = this.externalScrollTop();
      if (!this.syncScroll() || this.isSyncScrolling) return;
      const ta = this.textareaRef()?.nativeElement;
      if (!ta) return;
      this.isSyncScrolling = true;
      ta.scrollTop = top;
      this.syncOverlays(top, ta.scrollLeft);
      this.isSyncScrolling = false;
    });

    // Hunk navigation: scroll the textarea to the first changed line of the hunk
    effect(() => {
      const start = this.activeHunkStart();
      if (start < 0 || !this.showDiff()) return;
      const rows = this.diffRows();
      if (start >= rows.length) return;
      // Find the first real line number in the hunk for this side
      const side = this.diffSide();
      let lineNum: number | null = null;
      for (let i = start; i <= this.activeHunkEnd() && i < rows.length; i++) {
        const cell = side === 'left' ? rows[i].left : rows[i].right;
        if (cell.lineNumber !== null) { lineNum = cell.lineNumber; break; }
      }
      if (lineNum === null) return;
      const ta = this.textareaRef()?.nativeElement;
      if (!ta) return;
      const style = getComputedStyle(ta);
      const lineHeight = parseFloat(style.lineHeight);
      const paddingTop = parseFloat(style.paddingTop);
      const targetScrollTop = paddingTop + (lineNum - 1) * lineHeight - ta.clientHeight / 4;
      ta.scrollTop = Math.max(0, targetScrollTop);
      this.syncOverlays(ta.scrollTop, ta.scrollLeft);
    });
  }

  // ── Scroll ─────────────────────────────────────────────────────────────────

  onScroll(event: Event): void {
    const ta = event.target as HTMLTextAreaElement;
    this.syncOverlays(ta.scrollTop, ta.scrollLeft);
    if (this.showDiff() && this.syncScroll() && !this.isSyncScrolling) {
      this.diffScrolled.emit(ta.scrollTop);
    }
  }

  private syncOverlays(scrollTop: number, scrollLeft: number): void {
    const overlay = this.overlayRef()?.nativeElement;
    if (overlay) {
      overlay.scrollTop = scrollTop;
      overlay.scrollLeft = scrollLeft;
    }
    const bg = this.diffBgRef()?.nativeElement;
    if (bg) bg.scrollTop = scrollTop;
    const gutter = this.diffGutterRef()?.nativeElement;
    if (gutter) gutter.scrollTop = scrollTop;
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.rawTextChange.emit(textarea.value);
  }

  onPaste(event: ClipboardEvent): void {
    if (!this.autoFixEnabled()) return;

    const ta = event.target as HTMLTextAreaElement;
    const clipboardText = event.clipboardData?.getData('text') ?? '';
    if (!clipboardText) return;

    // Let the default paste happen first
    // But we need to intercept: prevent default and handle manually
    event.preventDefault();

    // Snapshot text before paste for potential revert
    this.textBeforePaste = ta.value;

    // Insert clipboard text at cursor position (simulating default paste)
    const start = ta.selectionStart ?? 0;
    const end   = ta.selectionEnd   ?? 0;
    const newValue = ta.value.slice(0, start) + clipboardText + ta.value.slice(end);
    this.pastedText = newValue;

    // Emit the new value immediately (optimistic update)
    this.rawTextChange.emit(newValue);

    // Check if result is already valid JSON
    try {
      JSON.parse(newValue);
      return; // All good, nothing to fix
    } catch (e) {
      // Try auto-fix pipeline
      const result = tryAutoFixJson(newValue);
      if (result.ok) {
        this.autoFixProposal.set(result);
      } else {
        const parseError = e instanceof SyntaxError ? e.message : 'JSON inválido';
        this.autoFixFailureMsg.set(parseError);
      }
    }
  }

  onAutoFixClosed(result: AutoFixModalResult): void {
    if (result.action === 'accept' && this.autoFixProposal()) {
      // Apply the fix
      this.rawTextChange.emit(this.autoFixProposal()!.fixedText);
    } else if (result.action === 'revert') {
      // Revert to text before paste (or lastValidText if provided)
      const revertTo = this.lastValidText() || this.textBeforePaste;
      this.rawTextChange.emit(revertTo);
      this.textReverted.emit(revertTo);
    }
    // 'keep': nothing to change — user accepts the invalid text
    this.autoFixProposal.set(null);
    this.autoFixFailureMsg.set(null);
  }

  onTextareaClick(event: MouseEvent): void {
    if (this.formatOnAltClick() && event.altKey && event.button === 0) {
      event.preventDefault();
      this.formatRequested.emit();
    }
  }

  onBadgeClick(): void {
    if (this.formatOnBadgeClick()) {
      this.formatRequested.emit();
    }
  }

  onRepairPressed(): void {
    const text = this.rawText();
    // Snapshot current text for modal diff and potential revert
    this.pastedText = text;
    this.textBeforePaste = text;

    let parseError = 'JSON inválido';
    try { JSON.parse(text); } catch (e) {
      if (e instanceof SyntaxError) parseError = e.message;
    }

    const result = tryAutoFixJson(text);
    if (result.ok) {
      this.autoFixProposal.set(result);
    } else {
      this.autoFixFailureMsg.set(parseError);
    }
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
}

