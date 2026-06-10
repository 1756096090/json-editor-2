import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ColorRule } from '../../../../core/formats/models/color-rule.model';
import { SegmentedControlComponent, SegmentItem } from '../../../../components/ui/segmented-control/segmented-control.component';
import { JsonTreeViewComponent } from '../../../../components/ui/json-tree-view/json-tree-view.component';
import { JsonTableViewComponent } from '../../../../components/ui/json-table-view/json-table-view.component';
import type { DiffLineDecoration } from '../../../json-workbench/utils/diff-engine.types';

@Component({
  selector: 'app-editor-lab-pane',
  imports: [SegmentedControlComponent, JsonTreeViewComponent, JsonTableViewComponent],
  templateUrl: './editor-lab-pane.component.html',
  styleUrl: './editor-lab-pane.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorLabPaneComponent {
  readonly title = input.required<string>();
  readonly value = input<string>('');
  readonly active = input<boolean>(false);
  readonly errorMessage = input<string>('');
  readonly diffDecorations = input<DiffLineDecoration[]>([]);
  readonly ariaLabel = input<string>('JSON editor');
  readonly colorRules = input<ColorRule[]>([]);
  readonly formatItems = input<SegmentItem[]>([]);
  readonly selectedFormatValue = input<string>('');
  readonly versions = input<string[]>([]);
  readonly selectedVersionIndex = input<number>(0);

  readonly valueChange = output<string>();
  readonly focused = output<void>();
  readonly saveVersionRequested = output<void>();
  readonly versionSelected = output<number>();
  readonly removeVersionRequested = output<number>();
  readonly formatRequested = output<void>();
  readonly formatChange = output<string>();
  readonly minifyRequested = output<void>();
  readonly clearRequested = output<void>();
  readonly copyRequested = output<void>();
  readonly pasteRequested = output<void>();
  readonly openFileRequested = output<void>();
  readonly downloadPrettyRequested = output<void>();
  readonly downloadMinifiedRequested = output<void>();
  readonly dropFile = output<File>();
  readonly autoFixRequested = output<string>();

  private readonly sanitizer = inject(DomSanitizer);

  private readonly highlightPre = viewChild<ElementRef<HTMLElement>>('highlightPre');

  readonly cursorLine = signal(1);
  readonly cursorColumn = signal(1);
  readonly gutterOffset = signal(0);
  readonly viewMode = signal<'text' | 'tree' | 'table'>('text');
  readonly isDragging = signal(false);
  readonly lineNumbers = computed(() =>
    Array.from({ length: this.value().split('\n').length }, (_, index) => index + 1)
  );
  readonly diffLineKindMap = computed(() => {
    const map = new Map<number, DiffLineDecoration['kind']>();
    for (const decoration of this.diffDecorations()) {
      map.set(decoration.lineNumber, decoration.kind);
    }
    return map;
  });
  readonly isJsonFormat = computed(() => this.selectedFormatValue().toUpperCase() === 'JSON');
  readonly parsedJsonValue = computed<unknown | null>(() => {
    if (!this.isJsonFormat()) return null;

    const raw = this.value().trim();
    if (raw === '') return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  readonly canUseTreeView = computed(() => this.parsedJsonValue() !== null);
  readonly canUseTableView = computed(() => {
    const parsed = this.parsedJsonValue();
    return Array.isArray(parsed) && parsed.length > 0;
  });
  readonly highlightedValue = computed<SafeHtml>(() => {
    const value = this.value();
    const rules = this.colorRules();
    const lineKinds = this.diffLineKindMap();

    const lines = value === '' ? [''] : value.split('\n');
    const html = lines
      .map((line, index) => {
        const lineNumber = index + 1;
        const kind = lineKinds.get(lineNumber);
        const className = kind ? ` editor-lab-pane__code-line--${kind}` : '';
        const lineHtml = this.highlightLineWithRules(line, rules);
        return `<span class="editor-lab-pane__code-line${className}">${lineHtml}</span>`;
      })
      .join('');

    return this.sanitizer.bypassSecurityTrustHtml(html || '<span class="editor-lab-pane__code-line">&nbsp;</span>');
  });


  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.updateCursorPosition(target);
    this.valueChange.emit(target?.value ?? '');

    if ((this.viewMode() === 'tree' || this.viewMode() === 'table') && !this.canUseTreeView()) {
      this.viewMode.set('text');
    }
  }

  onFocus(event: FocusEvent): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.updateCursorPosition(target);
    this.focused.emit();
  }

  onSaveVersion(): void {
    this.saveVersionRequested.emit();
  }

  onSelectVersion(index: number): void {
    this.versionSelected.emit(index);
  }

  onRemoveVersion(index: number): void {
    this.removeVersionRequested.emit(index);
  }

  onFormat(): void {
    this.formatRequested.emit();
  }

  onFormatChange(value: string): void {
    this.formatChange.emit(value);

    if ((this.viewMode() === 'tree' || this.viewMode() === 'table') && value.toUpperCase() !== 'JSON') {
      this.viewMode.set('text');
    }
  }

  onMinify(): void {
    this.minifyRequested.emit();
  }

  onClear(): void {
    this.clearRequested.emit();

    if (this.viewMode() !== 'text') {
      this.viewMode.set('text');
    }
  }

  toggleTreeView(): void {
    if (!this.isJsonFormat() || !this.canUseTreeView()) {
      return;
    }

    this.viewMode.set(this.viewMode() === 'tree' ? 'text' : 'tree');
  }

  toggleTableView(): void {
    if (!this.isJsonFormat() || !this.canUseTableView()) {
      return;
    }

    this.viewMode.set(this.viewMode() === 'table' ? 'text' : 'table');
  }

  onCopy(): void {
    this.copyRequested.emit();
  }

  onPaste(): void {
    this.pasteRequested.emit();
  }

  onOpenFile(): void {
    this.openFileRequested.emit();
  }

  onDownloadPretty(): void {
    this.downloadPrettyRequested.emit();
  }

  onDownloadMinified(): void {
    this.downloadMinifiedRequested.emit();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const file = event.dataTransfer?.files?.item(0);
    if (file) {
      this.dropFile.emit(file);
    }
  }

  onPasteEvent(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (pasted.trim() === '') return;
    this.autoFixRequested.emit(pasted);
  }

  onCursorChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.updateCursorPosition(target);
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    const scrollTop = target?.scrollTop ?? 0;
    this.gutterOffset.set(scrollTop);
    const pre = this.highlightPre();
    if (pre) {
      pre.nativeElement.scrollTop = scrollTop;
    }
  }

  isDiffLine(lineNumber: number): boolean {
    return this.diffLineKindMap().has(lineNumber);
  }

  getDiffLineClass(lineNumber: number): string {
    const kind = this.diffLineKindMap().get(lineNumber);
    if (!kind) return '';
    return `editor-lab-pane__line-number--${kind}`;
  }

  private updateCursorPosition(textarea: HTMLTextAreaElement | null): void {
    if (!textarea) {
      this.cursorLine.set(1);
      this.cursorColumn.set(1);
      this.gutterOffset.set(0);
      return;
    }

    const caretIndex = textarea.selectionStart ?? 0;
    const contentBeforeCaret = textarea.value.slice(0, caretIndex);
    const lines = contentBeforeCaret.split('\n');

    this.cursorLine.set(lines.length);
    this.cursorColumn.set((lines.at(-1)?.length ?? 0) + 1);
    this.gutterOffset.set(textarea.scrollTop);
    const pre = this.highlightPre();
    if (pre) {
      pre.nativeElement.scrollTop = textarea.scrollTop;
    }
  }

  private highlightLineWithRules(value: string, rules: ColorRule[]): string {
    if (value === '') return '&nbsp;';
    if (rules.length === 0) return this.escapeHtml(value);

    const combined = rules.map((r) => `(${r.pattern})`).join('|');
    const regex = new RegExp(combined, 'g');
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(value)) !== null) {
      result += this.escapeHtml(value.slice(lastIndex, match.index));
      const token = match[0];
      const ruleIndex = match.slice(1).findIndex((g) => g !== undefined);
      const rule = ruleIndex >= 0 ? rules[ruleIndex] : undefined;

      if (rule) {
        const style = rule.fontWeight
          ? `color:${rule.color};font-weight:${rule.fontWeight}`
          : `color:${rule.color}`;
        result += `<span style="${style}">${this.escapeHtml(token)}</span>`;
      } else {
        result += this.escapeHtml(token);
      }

      lastIndex = match.index + token.length;
    }

    result += this.escapeHtml(value.slice(lastIndex));
    return result || '&nbsp;';
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}
