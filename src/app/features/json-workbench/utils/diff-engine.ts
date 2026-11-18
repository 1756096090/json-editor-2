/**
 * diff-engine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fast, lightweight diff engine.
 * Produces line-level decorations for overlaying on two Monaco editors.
 *
 * Strategy:
 *  1) Line-level diff via `diffLines` (Myers O(ND) — fast for few changes).
 *  2) Character-level refinement for replacement blocks.
 *  3) Early exit for identical or empty texts.
 */

import { diffChars, diffLines } from 'diff';
import type { Change } from 'diff';
import type { DiffResult, DiffHunk, DiffLineDecoration } from './diff-engine.types';

export type { DiffResult, DiffHunk, DiffLineDecoration } from './diff-engine.types';
export { WORKER_THRESHOLD } from './diff-engine.types';

// ── Main API ─────────────────────────────────────────────────────────────────

/**
 * Compute a lightweight line-level diff between `left` (baseline) and `right` (working).
 * Returns decoration arrays for each editor and hunk navigation targets.
 */
export function computeDiff(left: string, right: string): DiffResult {
  const t0 = performance.now();

  if (!left && !right) return empty(t0);
  if (left === right) return empty(t0);

  const baseline = normalizeEol(left);
  const working = normalizeEol(right);

  const changes = diffLines(baseline, working, { newlineIsToken: false });

  const leftDeco: DiffLineDecoration[] = [];
  const rightDeco: DiffLineDecoration[] = [];
  const hunks: DiffHunk[] = [];

  let leftLine = 1;
  let rightLine = 1;
  let addedCount = 0;
  let removedCount = 0;
  let inHunk = false;
  let hunkLeftStart = 0;
  let hunkRightStart = 0;

  let i = 0;
  while (i < changes.length) {
    const change = changes[i];

    // Refine replacement blocks so an inserted comma/field does not paint
    // unchanged text as a deletion and an addition.
    if (change.removed && changes[i + 1]?.added) {
      const next = changes[i + 1];
      const refined = diffChars(change.value, next.value, { maxEditLength: 2000, timeout: 30 });
      if (refined) {
        if (!inHunk) {
          inHunk = true;
          hunkLeftStart = leftLine;
          hunkRightStart = rightLine;
        }
        const leftInline: DiffLineDecoration[] = [];
        const rightInline: DiffLineDecoration[] = [];
        let oldOffset = 0;
        let newOffset = 0;
        for (const part of refined) {
          if (part.removed) {
            addInlineRanges(change.value, oldOffset, part.value.length, leftLine, 'removed', leftInline);
          } else if (part.added) {
            addInlineRanges(next.value, newOffset, part.value.length, rightLine, 'added', rightInline);
          }
          if (!part.added) oldOffset += part.value.length;
          if (!part.removed) newOffset += part.value.length;
        }
        leftDeco.push(...leftInline);
        rightDeco.push(...rightInline);
        removedCount += new Set(leftInline.map(d => d.lineNumber)).size;
        addedCount += new Set(rightInline.map(d => d.lineNumber)).size;
        leftLine += countLines(change);
        rightLine += countLines(next);
        i += 2;
        continue;
      }
    }

    if (change.added) {
      // ── Added block → decorations on the right panel ──
      const lines = splitLines(change);
      if (!inHunk) {
        inHunk = true;
        hunkLeftStart = leftLine;
        hunkRightStart = rightLine;
      }
      for (let j = 0; j < lines.length; j++) {
        rightDeco.push({ lineNumber: rightLine++, kind: 'added', startColumn: 1, endColumn: lines[j].length + 1 });
      }
      addedCount += lines.length;
      i++;
      continue;
    }

    if (change.removed) {
      // ── Removed block → decorations on the left panel ──
      const lines = splitLines(change);
      if (!inHunk) {
        inHunk = true;
        hunkLeftStart = leftLine;
        hunkRightStart = rightLine;
      }
      for (let j = 0; j < lines.length; j++) {
        leftDeco.push({ lineNumber: leftLine++, kind: 'removed', startColumn: 1, endColumn: lines[j].length + 1 });
      }
      removedCount += lines.length;
      i++;
      continue;
    }

    // ── Context (unchanged) — close any open hunk ──
    if (inHunk) {
      hunks.push({ leftLine: hunkLeftStart, rightLine: hunkRightStart });
      inHunk = false;
    }
    const count = countLines(change);
    leftLine += count;
    rightLine += count;
    i++;
  }

  // Close trailing hunk
  if (inHunk) {
    hunks.push({ leftLine: hunkLeftStart, rightLine: hunkRightStart });
  }

  return {
    leftDecorations: leftDeco,
    rightDecorations: rightDeco,
    hunks,
    addedCount,
    removedCount,
    computeMs: performance.now() - t0,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function addInlineRanges(
  text: string, offset: number, length: number, firstLine: number,
  kind: 'added' | 'removed', decorations: DiffLineDecoration[]
): void {
  const prefix = text.slice(0, offset).split('\n');
  let lineNumber = firstLine + prefix.length - 1;
  let column = prefix[prefix.length - 1].length + 1;
  for (const part of text.slice(offset, offset + length).split('\n')) {
    if (part.length) decorations.push({ lineNumber, kind, startColumn: column, endColumn: column + part.length });
    lineNumber++;
    column = 1;
  }
}

function empty(t0: number): DiffResult {
  return {
    leftDecorations: [],
    rightDecorations: [],
    hunks: [],
    addedCount: 0,
    removedCount: 0,
    computeMs: performance.now() - t0,
  };
}

function normalizeEol(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

/** Count lines in a Change without allocating an array (faster for context blocks). */
function countLines(change: Change): number {
  const val = change.value;
  if (!val) return 0;
  let count = 0;
  for (let i = 0; i < val.length; i++) {
    if (val.charCodeAt(i) === 10) count++;
  }
  // If last char is \n the split would produce a trailing empty — don't count it
  return val.charCodeAt(val.length - 1) === 10 ? count : count + 1;
}

/**
 * Split Change.value into lines (without trailing empty line from ending '\n').
 * Only used for changed blocks where we need the actual count.
 */
function splitLines(change: Change): string[] {
  if (change.value === '') return [''];
  const parts = change.value.split('\n');
  if (parts.length > 0 && parts[parts.length - 1] === '') {
    parts.pop();
  }
  return parts.length > 0 ? parts : [''];
}
