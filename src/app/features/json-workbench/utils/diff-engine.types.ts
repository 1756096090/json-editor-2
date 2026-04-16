/**
 * diff-engine.types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Type definitions and constants for the diff engine.
 * Shared between main thread and Web Worker.
 */

// ── Public constants ─────────────────────────────────────────────────────────
export const WORKER_THRESHOLD = 50_000;

// ── Public types ─────────────────────────────────────────────────────────────

/** A single line decoration for a Monaco editor. */
export interface DiffLineDecoration {
  lineNumber: number;
  kind: 'added' | 'removed' | 'modified';
}

/** Navigation target for a diff hunk. */
export interface DiffHunk {
  leftLine: number;
  rightLine: number;
}

/** Lightweight diff result — just line-level decorations for each editor. */
export interface DiffResult {
  leftDecorations: DiffLineDecoration[];
  rightDecorations: DiffLineDecoration[];
  hunks: DiffHunk[];
  addedCount: number;
  removedCount: number;
  computeMs: number;
}
