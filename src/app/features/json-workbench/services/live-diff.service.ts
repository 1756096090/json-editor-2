import { Injectable, OnDestroy, signal } from '@angular/core';
import { WORKER_THRESHOLD, computeDiff } from '../utils/diff-engine';
import type { DiffResult } from '../utils/diff-engine';
import type { WorkerRequest, WorkerResponse } from '../workers/diff.worker';

/** ms to wait after last keystroke before computing diff */
const DEBOUNCE_MS = 150;
/**
 * ms after computation starts before we show the "Computing…" label.
 * Prevents a flash for fast (main-thread) diffs.
 */
const SHOW_COMPUTING_AFTER_MS = 150;

/**
 * Manages live diff lifecycle. Provided at component level.
 *
 * Usage:
 *   service.schedule(leftText, rightText)  ← call on every input change
 *   service.result()                       ← signal<DiffResult | null>
 *   service.computing()                    ← signal<boolean>
 */
@Injectable()
export class LiveDiffService implements OnDestroy {
  readonly result = signal<DiffResult | null>(null);
  readonly computing = signal(false);

  private worker: Worker | null = null;
  private pendingRequestId = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private computingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/diff.worker', import.meta.url), {
        type: 'module'
      });
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, result } = event.data;
        // Ignore stale responses from cancelled requests
        if (id !== this.pendingRequestId) return;
        this.clearComputingTimer();
        this.result.set(result);
        this.computing.set(false);
      };
    }
  }

  /**
   * Schedule a diff computation.
   * Each call resets the debounce timer; the diff runs 150ms after the last call.
   */
  schedule(leftText: string, rightText: string): void {
    this.cancelDebounce();
    this.debounceTimer = setTimeout(() => this.run(leftText, rightText), DEBOUNCE_MS);
  }

  /**
   * Immediately clear the result (e.g. when exiting diff mode).
   */
  clear(): void {
    this.cancelDebounce();
    this.pendingRequestId++;
    this.clearComputingTimer();
    this.result.set(null);
    this.computing.set(false);
  }

  ngOnDestroy(): void {
    this.cancelDebounce();
    this.clearComputingTimer();
    this.worker?.terminate();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private run(leftText: string, rightText: string): void {
    const totalSize = leftText.length + rightText.length;

    if (this.worker && totalSize >= WORKER_THRESHOLD) {
      // Large payload → send to worker, show computing indicator after delay
      this.pendingRequestId++;
      const id = this.pendingRequestId;
      this.startComputingTimer();
      const msg: WorkerRequest = { id, leftText, rightText };
      this.worker.postMessage(msg);
    } else {
      // Small payload → compute synchronously on main thread
      this.clearComputingTimer();
      this.computing.set(false);
      const r = computeDiff(leftText, rightText);
      this.result.set(r);
    }
  }

  private startComputingTimer(): void {
    this.clearComputingTimer();
    this.computingTimer = setTimeout(() => {
      this.computing.set(true);
    }, SHOW_COMPUTING_AFTER_MS);
  }

  private clearComputingTimer(): void {
    if (this.computingTimer !== null) {
      clearTimeout(this.computingTimer);
      this.computingTimer = null;
    }
    this.computing.set(false);
  }

  private cancelDebounce(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
