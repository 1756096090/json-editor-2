/**
 * diff-engine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fast, lightweight diff engine.
 * Produces line-level decorations for overlaying on two Monaco editors.
 *
 * Strategy:
 *  1) Line-level diff via `diffLines` (Myers O(ND) — fast for few changes).
 *  2) No word-level diff — only line-level kind (added/removed/modified).
 *  3) Early exit for identical or empty texts.
 */

import { diffLines } from 'diff';
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

    if (change.added) {
      // ── Added block → decorations on the right panel ──
      const lines = splitLines(change);
      if (!inHunk) {
        inHunk = true;
        hunkLeftStart = leftLine;
        hunkRightStart = rightLine;
      }
      for (let j = 0; j < lines.length; j++) {
        rightDeco.push({ lineNumber: rightLine++, kind: 'added' });
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
        leftDeco.push({ lineNumber: leftLine++, kind: 'removed' });
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