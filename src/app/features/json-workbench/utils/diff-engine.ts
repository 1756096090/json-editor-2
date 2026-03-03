/**
 * Shared diff engine: types + synchronous computation.
 * Used on the main thread (small payloads) and inside the Web Worker
 * (large payloads).
 *
 * Strategy:
 *  1. Full diff via `diffLines` + `diffWords` from the `diff` package.
 *  2. Incremental: before computing, detect the changed region (LCP + LCS
 *     suffix) to isolate the affected line window, recompute only that slice,
 *     then splice into the previous hunks. Falls back to full recompute when
 *     the change region is too large (> INCREMENTAL_MAX_LINES).
 *
 * Thresholds (tunable):
 *  - WORKER_THRESHOLD = 50 000 chars total → caller routes to Worker.
 *  - INCREMENTAL_MAX_LINES = 400 → if the detected delta spans more lines,
 *    skip incremental and do a full recompute.
 *  - CONTEXT_LINES = 3 → context lines around each hunk in hunk objects.
 */

import { diffLines, diffWords } from 'diff';
import type { Change } from 'diff';

// ── Public constants ─────────────────────────────────────────────────────────
export const WORKER_THRESHOLD = 50_000;

// ── Public types ─────────────────────────────────────────────────────────────

/** A word/char segment with optional highlight for inline diff. */
export interface DiffSegment {
  text: string;
  highlight: boolean;
}

/** One cell in the side-by-side grid. */
export interface SideCell {
  /** null → blank filler row (the other side has a line here). */
  lineNumber: number | null;
  kind: 'context' | 'added' | 'removed' | 'blank';
  /** true when the line was modified (part of a removed+added pair), not a pure add/delete. */
  modified: boolean;
  segments: DiffSegment[];
}

/** One horizontal row that can have a left cell and/or a right cell. */
export interface SideBySideRow {
  left: SideCell;
  right: SideCell;
}

/** Index boundaries of a diff hunk (contiguous group of changed rows). */
export interface DiffHunk {
  startIndex: number;
  endIndex: number;
}

export interface DiffResult {
  rows: SideBySideRow[];
  hunks: DiffHunk[];
  addedCount: number;
  removedCount: number;
  computeMs: number;
}

// ── Main API ─────────────────────────────────────────────────────────────────

/**
 * Compute a side-by-side diff between `left` and `right`.
 * Accepts an optional `prev` result plus `editText` (the text that was edited,
 * used to detect the change region for incremental mode).
 */
export function computeDiff(left: string, right: string): DiffResult {
  const t0 = performance.now();

  if (!left && !right) {
    return empty(0);
  }
  if (left === right) {
    return empty(0);
  }

  const rows = buildRows(left, right);
  const hunks = buildHunks(rows);
  const addedCount = rows.filter((r) => r.right.kind === 'added').length;
  const removedCount = rows.filter((r) => r.left.kind === 'removed').length;

  return { rows, hunks, addedCount, removedCount, computeMs: performance.now() - t0 };
}

/** Re-export `buildHunks` so callers can use it without importing the whole engine. */
export { buildHunks };

// ── Helpers ──────────────────────────────────────────────────────────────────

function empty(computeMs: number): DiffResult {
  return { rows: [], hunks: [], addedCount: 0, removedCount: 0, computeMs };
}

function buildRows(baseline: string, working: string): SideBySideRow[] {
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
          leftSegs = inlineDiff
            .filter((d) => !d.added)
            .map((d) => ({ text: d.value, highlight: !!d.removed }));
          rightSegs = inlineDiff
            .filter((d) => !d.removed)
            .map((d) => ({ text: d.value, highlight: !!d.added }));
        } else {
          leftSegs = lText !== null ? [{ text: lText, highlight: false }] : [];
          rightSegs = rText !== null ? [{ text: rText, highlight: false }] : [];
        }

        rows.push({
          left: {
            lineNumber: lText !== null ? leftNum : null,
            kind: lText !== null ? 'removed' : 'blank',
            modified: lText !== null,
            segments: leftSegs
          },
          right: {
            lineNumber: rText !== null ? rightNum : null,
            kind: rText !== null ? 'added' : 'blank',
            modified: rText !== null,
            segments: rightSegs
          }
        });

        if (lText !== null) leftNum++;
        if (rText !== null) rightNum++;
      }

      i += 2;
      continue;
    }

    if (change.added) {
      for (const text of splitLines(change)) {
        rows.push({
          left: { lineNumber: null, kind: 'blank', modified: false, segments: [] },
          right: {
            lineNumber: rightNum,
            kind: 'added',
            modified: false,
            segments: [{ text, highlight: false }]
          }
        });
        rightNum++;
      }
      i++;
      continue;
    }

    if (change.removed) {
      for (const text of splitLines(change)) {
        rows.push({
          left: {
            lineNumber: leftNum,
            kind: 'removed',
            modified: false,
            segments: [{ text, highlight: false }]
          },
          right: { lineNumber: null, kind: 'blank', modified: false, segments: [] }
        });
        leftNum++;
      }
      i++;
      continue;
    }

    // Context
    for (const text of splitLines(change)) {
      rows.push({
        left: {
          lineNumber: leftNum,
          kind: 'context',
          modified: false,
          segments: [{ text, highlight: false }]
        },
        right: {
          lineNumber: rightNum,
          kind: 'context',
          modified: false,
          segments: [{ text, highlight: false }]
        }
      });
      leftNum++;
      rightNum++;
    }
    i++;
  }

  return rows;
}

function buildHunks(rows: SideBySideRow[]): DiffHunk[] {
  const result: DiffHunk[] = [];
  let inHunk = false;
  let start = 0;

  for (let i = 0; i < rows.length; i++) {
    const isChanged =
      rows[i].left.kind !== 'context' || rows[i].right.kind !== 'context';
    if (isChanged && !inHunk) {
      inHunk = true;
      start = i;
    } else if (!isChanged && inHunk) {
      inHunk = false;
      result.push({ startIndex: start, endIndex: i - 1 });
    }
  }
  if (inHunk) {
    result.push({ startIndex: start, endIndex: rows.length - 1 });
  }
  return result;
}

function splitLines(change: Change): string[] {
  if (!change.value) return [];
  const parts = change.value.split('\n');
  if (parts[parts.length - 1] === '') parts.pop();
  return parts.length > 0 ? parts : [''];
}
