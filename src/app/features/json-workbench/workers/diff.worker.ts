/// <reference lib="webworker" />

/**
 * Diff Web Worker.
 * Receives { id, leftText, rightText } and responds with { id, result }.
 * Running off the main thread avoids blocking the UI for large payloads.
 */

import { computeDiff } from '../utils/diff-engine';
import type { DiffResult } from '../utils/diff-engine';

export interface WorkerRequest {
  id: number;
  leftText: string;
  rightText: string;
}

export interface WorkerResponse {
  id: number;
  result: DiffResult;
}

addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { id, leftText, rightText } = event.data;
  const result = computeDiff(leftText, rightText);
  postMessage({ id, result } satisfies WorkerResponse);
});
