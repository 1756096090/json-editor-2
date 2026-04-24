import { Injectable, inject } from '@angular/core';
import { WorkbenchStore } from '../state/workbench.store';
import { TabsService } from '../../../core/tabs.service';
import { RecentDocsService } from '../../../core/recent-docs.service';
import { openJsonFilePicker, readFileAsText } from '../utils/file-utils';

/**
 * Facade for file operations, tabs, and panel content updates.
 * Centralizes I/O and state mutations for files and tabs.
 */
@Injectable({ providedIn: 'root' })
export class PanelOperationsFacade {
  private readonly store = inject(WorkbenchStore);
  private readonly tabs = inject(TabsService);
  private readonly recentDocs = inject(RecentDocsService);

  // ── Tab operations ────────────────────────────────────────────────────

  switchLeftTab(newId: string): void {
    const content = this.tabs.switchLeft(newId, this.store.rawText());
    this.store.setRawText(content);
  }

  switchRightTab(newId: string): void {
    const content = this.tabs.switchRight(newId, this.store.baselineText());
    this.store.setBaselineText(content);
  }

  addLeftTab(): void {
    this.tabs.addLeftTab(this.store.rawText());
    this.store.setRawText('');
  }

  addRightTab(): void {
    this.tabs.addRightTab(this.store.baselineText());
    this.store.setBaselineText('');
  }

  closeLeftTab(id: string): void {
    const next = this.tabs.closeLeftTab(id, this.store.rawText());
    if (next !== null) this.store.setRawText(next);
  }

  closeRightTab(id: string): void {
    const next = this.tabs.closeRightTab(id, this.store.baselineText());
    if (next !== null) this.store.setBaselineText(next);
  }

  // ── File I/O ──────────────────────────────────────────────────────────

  async openFileIntoActivePanel(): Promise<void> {
    try {
      const file = await openJsonFilePicker();
      if (this.store.activePanel() === 'right') {
        this.store.setBaselineText(file.content);
        this.store.setStatusMessage(`Loaded file into Output: ${file.fileName}`);
      } else {
        this.setLeftPanelContent(file.content, file.fileName);
        this.store.setStatusMessage(`Loaded file into Input: ${file.fileName}`);
      }
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Open file failed', error));
    }
  }

  async loadFileIntoPanel(file: File, panel: 'left' | 'right'): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.store.setStatusMessage('Only .json files are supported.');
      return;
    }
    try {
      const text = await readFileAsText(file);
      if (panel === 'left') {
        this.setLeftPanelContent(text, file.name);
        this.store.setStatusMessage(`Loaded file into Input: ${file.name}`);
      } else {
        this.store.setBaselineText(text);
        this.store.setStatusMessage(`Loaded file into Output: ${file.name}`);
      }
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('File load failed', error));
    }
  }

  async loadFromUrl(rawUrl: string, target: 'left' | 'right'): Promise<void> {
    const url = this.parseHttpUrl(rawUrl);
    if (!url) {
      this.store.setStatusMessage('Invalid URL — must start with http:// or https://');
      return;
    }

    try {
      const response = await fetch(rawUrl);
      if (!response.ok) {
        this.store.setStatusMessage(`HTTP ${response.status}: ${response.statusText}`);
        return;
      }
      const text = await response.text();
      JSON.parse(text); // validate JSON before loading
      const sizeKb = (new TextEncoder().encode(text).length / 1024).toFixed(1);

      if (target === 'right') {
        this.store.setBaselineText(text);
      } else {
        this.setLeftPanelContent(text, url.hostname + url.pathname);
      }
      this.store.setStatusMessage(`Loaded from URL — ${sizeKb} KB`);
    } catch (error) {
      const msg = error instanceof SyntaxError
        ? 'Response is not valid JSON.'
        : this.toActionError('URL import failed', error);
      this.store.setStatusMessage(msg);
    }
  }

  // ── Panel mode ────────────────────────────────────────────────────────

  setLeftMode(mode: string): void {
    this.store.setLeftMode(mode as any);
  }

  setRightMode(mode: string): void {
    this.store.setRightMode(mode as any);
  }

  // ── Panel active state ────────────────────────────────────────────────

  setLeftPanelActive(): void {
    this.store.setActivePanel('left');
  }

  setRightPanelActive(): void {
    this.store.setActivePanel('right');
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private setLeftPanelContent(content: string, label: string): void {
    this.store.setRawText(content);
    this.recentDocs.push(label, content);
  }

  private parseHttpUrl(rawUrl: string): URL | null {
    try {
      const url = new URL(rawUrl);
      return (url.protocol === 'http:' || url.protocol === 'https:') ? url : null;
    } catch {
      return null;
    }
  }

  private toActionError(prefix: string, error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    return `${prefix}: ${errorMessage}`;
  }
}
