import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ColorRule } from '../../../../core/formats/models/color-rule.model';
import { SegmentedControlComponent, SegmentItem } from '../../../../components/ui/segmented-control/segmented-control.component';

@Component({
  selector: 'app-editor-lab-pane',
  imports: [SegmentedControlComponent],
  templateUrl: './editor-lab-pane.component.html',
  styleUrl: './editor-lab-pane.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorLabPaneComponent {
  readonly title = input.required<string>();
  readonly value = input<string>('');
  readonly active = input<boolean>(false);
  readonly errorMessage = input<string>('');
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
  readonly validateRequested = output<void>();
  readonly formatChange = output<string>();
  readonly minifyRequested = output<void>();
  readonly clearRequested = output<void>();

  private readonly sanitizer = inject(DomSanitizer);

  private readonly highlightPre = viewChild<ElementRef<HTMLElement>>('highlightPre');

  readonly cursorLine = signal(1);
  readonly cursorColumn = signal(1);
  readonly gutterOffset = signal(0);
  readonly lineNumbers = computed(() =>
    Array.from({ length: this.value().split('\n').length }, (_, index) => index + 1)
  );
  readonly highlightedValue = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.highlightWithRules(this.value(), this.colorRules()))
  );


  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.updateCursorPosition(target);
    this.valueChange.emit(target?.value ?? '');
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

  onValidate(): void {
    this.validateRequested.emit();
  }

  onFormatChange(value: string): void {
    this.formatChange.emit(value);
  }

  onMinify(): void {
    this.minifyRequested.emit();
  }

  onClear(): void {
    this.clearRequested.emit();
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

  private highlightWithRules(value: string, rules: ColorRule[]): string {
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
