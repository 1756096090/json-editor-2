import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { diffLines, diffWords } from 'diff';
import type { Change } from 'diff';
import { ButtonComponent } from '../../../../components/ui/button/button.component';
import { EmptyStateComponent } from '../../../../components/ui/empty-state/empty-state.component';

/** A word/char segment with optional highlight for inline diff */
interface DiffSegment {
  text: string;
  highlight: boolean;
}

/** One cell in the side-by-side grid */
interface SideCell {
  /** null → blank filler row (the other side has a line here) */
  lineNumber: number | null;
  kind: 'context' | 'added' | 'removed' | 'blank';
  segments: DiffSegment[];
}

/** One horizontal row that can have a left cell and/or a right cell */
export interface SideBySideRow {
  left: SideCell;
  right: SideCell;
}

/** Index boundaries of a diff hunk (contiguous group of changed rows) */
interface DiffHunk {
  startIndex: number;
  endIndex: number;
}

@Component({
  selector: 'app-diff-panel',
  imports: [ButtonComponent, EmptyStateComponent],
  templateUrl: './diff-panel.component.html',
  styleUrl: './diff-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiffPanelComponent {
  readonly baselineText = input<string>('');
  readonly workingText = input<string>('');

  readonly setBaselinePressed = output<void>();
  readonly resetBaselinePressed = output<void>();

  private readonly leftPane = viewChild<ElementRef<HTMLElement>>('leftPane');
  private readonly rightPane = viewChild<ElementRef<HTMLElement>>('rightPane');

  /** Current diff navigation index (-1 means no selection) */
  readonly currentHunkIndex = signal(-1);

  readonly rows = computed<SideBySideRow[]>(() =>
    buildSideBySideRows(this.baselineText(), this.workingText())
  );

  /** Find contiguous groups of changed rows */
  readonly hunks = computed<DiffHunk[]>(() => {
    const allRows = this.rows();
    const result: DiffHunk[] = [];
    let inHunk = false;
    let start = 0;

    for (let i = 0; i < allRows.length; i++) {
      const isChanged = allRows[i].left.kind !== 'context' || allRows[i].right.kind !== 'context';
      if (isChanged && !inHunk) {
        inHunk = true;
        start = i;
      } else if (!isChanged && inHunk) {
        inHunk = false;
        result.push({ startIndex: start, endIndex: i - 1 });
      }
    }
    if (inHunk) {
      result.push({ startIndex: start, endIndex: allRows.length - 1 });
    }
    return result;
  });

  readonly hunkCount = computed(() => this.hunks().length);

  readonly hasBaseline = computed<boolean>(
    () => this.baselineText().length > 0 && this.workingText().length > 0
  );
  readonly hasChanges = computed<boolean>(() =>
    this.rows().some((r) => r.left.kind !== 'context' || r.right.kind !== 'context')
  );

  readonly addedCount = computed<number>(
    () => this.rows().filter((r) => r.right.kind === 'added').length
  );
  readonly removedCount = computed<number>(
    () => this.rows().filter((r) => r.left.kind === 'removed').length
  );

  /** Row index of active hunk for highlighting */
  readonly activeHunkStart = computed(() => {
    const idx = this.currentHunkIndex();
    const h = this.hunks();
    return idx >= 0 && idx < h.length ? h[idx].startIndex : -1;
  });

  readonly activeHunkEnd = computed(() => {
    const idx = this.currentHunkIndex();
    const h = this.hunks();
    return idx >= 0 && idx < h.length ? h[idx].endIndex : -1;
  });

  isActiveHunkRow(rowIndex: number): boolean {
    return rowIndex >= this.activeHunkStart() && rowIndex <= this.activeHunkEnd();
  }

  goToPrevHunk(): void {
    const count = this.hunkCount();
    if (count === 0) return;
    const current = this.currentHunkIndex();
    const next = current <= 0 ? count - 1 : current - 1;
    this.currentHunkIndex.set(next);
    this.scrollToHunk(next);
  }

  goToNextHunk(): void {
    const count = this.hunkCount();
    if (count === 0) return;
    const current = this.currentHunkIndex();
    const next = current >= count - 1 ? 0 : current + 1;
    this.currentHunkIndex.set(next);
    this.scrollToHunk(next);
  }

  onLeftScroll(event: Event): void {
    const right = this.rightPane()?.nativeElement;
    if (right) {
      right.scrollTop = (event.target as HTMLElement).scrollTop;
    }
  }

  onRightScroll(event: Event): void {
    const left = this.leftPane()?.nativeElement;
    if (left) {
      left.scrollTop = (event.target as HTMLElement).scrollTop;
    }
  }

  private scrollToHunk(hunkIndex: number): void {
    const hunk = this.hunks()[hunkIndex];
    if (!hunk) return;

    const leftEl = this.leftPane()?.nativeElement;
    if (!leftEl) return;

    const rows = leftEl.querySelectorAll('.diff-panel__row');
    const target = rows[hunk.startIndex] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSideBySideRows(baseline: string, working: string): SideBySideRow[] {
  if (!baseline || baseline === working) return [];

  const changes = diffLines(baseline, working, { newlineIsToken: false });
  const rows: SideBySideRow[] = [];
  let leftNum = 1;
  let rightNum = 1;

  let i = 0;
  while (i < changes.length) {
    const change = changes[i];

    // Modification: removed immediately followed by added
    if (change.removed && i + 1 < changes.length && changes[i + 1].added) {
      const removedLines = splitLines(change);
      const addedLines = splitLines(changes[i + 1]);
      const len = Math.max(removedLines.length, addedLines.length);

      for (let j = 0; j < len; j++) {
        const lText = removedLines[j] ?? null;
        const rText = addedLines[j] ?? null;

        let leftSegs: DiffSegment[];
        let rightSegs: DiffSegment[];

        if (lText !== null && rText !== null) {
          const inlineDiff = diffWords(lText, rText);
          leftSegs = inlineDiff.filter((d) => !d.added).map((d) => ({ text: d.value, highlight: !!d.removed }));
          rightSegs = inlineDiff.filter((d) => !d.removed).map((d) => ({ text: d.value, highlight: !!d.added }));
        } else {
          leftSegs = lText !== null ? [{ text: lText, highlight: false }] : [];
          rightSegs = rText !== null ? [{ text: rText, highlight: false }] : [];
        }

        rows.push({
          left: {
            lineNumber: lText !== null ? leftNum : null,
            kind: lText !== null ? 'removed' : 'blank',
            segments: leftSegs
          },
          right: {
            lineNumber: rText !== null ? rightNum : null,
            kind: rText !== null ? 'added' : 'blank',
            segments: rightSegs
          }
        });

        if (lText !== null) leftNum++;
        if (rText !== null) rightNum++;
      }

      i += 2;
      continue;
    }

    // Pure addition
    if (change.added) {
      for (const text of splitLines(change)) {
        rows.push({
          left: { lineNumber: null, kind: 'blank', segments: [] },
          right: { lineNumber: rightNum, kind: 'added', segments: [{ text, highlight: false }] }
        });
        rightNum++;
      }
      i++;
      continue;
    }

    // Pure removal
    if (change.removed) {
      for (const text of splitLines(change)) {
        rows.push({
          left: { lineNumber: leftNum, kind: 'removed', segments: [{ text, highlight: false }] },
          right: { lineNumber: null, kind: 'blank', segments: [] }
        });
        leftNum++;
      }
      i++;
      continue;
    }

    // Context
    for (const text of splitLines(change)) {
      rows.push({
        left: { lineNumber: leftNum, kind: 'context', segments: [{ text, highlight: false }] },
        right: { lineNumber: rightNum, kind: 'context', segments: [{ text, highlight: false }] }
      });
      leftNum++;
      rightNum++;
    }
    i++;
  }

  return rows;
}

function splitLines(change: Change): string[] {
  if (!change.value) return [];
  const parts = change.value.split('\n');
  if (parts[parts.length - 1] === '') parts.pop();
  return parts.length > 0 ? parts : [''];
}

