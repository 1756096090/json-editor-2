import { Injectable, inject } from '@angular/core';
import { WorkbenchStore } from '../state/workbench.store';
import { TabsService } from '../../../core/tabs.service';
import { RecentDocsService } from '../../../core/recent-docs.service';
import { openJsonFilePicker, readFileAsText } from '../utils/file-utils';
import { I18nService } from '../../../core/i18n/i18n.service';

/**
 * Facade for file operations, tabs, and panel content updates.
 * Centralizes I/O and state mutations for files and tabs.
 */
@Injectable({ providedIn: 'root' })
export class PanelOperationsFacade {
  private readonly store = inject(WorkbenchStore);
  private readonly tabs = inject(TabsService);
  private readonly recentDocs = inject(RecentDocsService);
  private readonly i18n = inject(I18nService);

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

  async openFileIntoPanel(panel: 'left' | 'right' = this.store.activePanel()): Promise<void> {
    try {
      const file = await openJsonFilePicker();
      if (panel === 'right') {
        this.store.setBaselineText(file.content);
        this.store.setStatusMessage(this.i18n.t('ops.loadedOutput', { name: file.fileName }));
      } else {
        this.setLeftPanelContent(file.content, file.fileName);
        this.store.setStatusMessage(this.i18n.t('ops.loadedInput', { name: file.fileName }));
      }
    } catch (error) {
      this.store.setStatusMessage(this.toActionError(this.i18n.t('ops.openFailed'), error));
    }
  }

  async loadFileIntoPanel(file: File, panel: 'left' | 'right'): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.store.setStatusMessage(this.i18n.t('ops.onlyJson'));
      return;
    }
    try {
      const text = await readFileAsText(file);
      if (panel === 'left') {
        this.setLeftPanelContent(text, file.name);
        this.store.setStatusMessage(this.i18n.t('ops.loadedInput', { name: file.name }));
      } else {
        this.store.setBaselineText(text);
        this.store.setStatusMessage(this.i18n.t('ops.loadedOutput', { name: file.name }));
      }
    } catch (error) {
      this.store.setStatusMessage(this.toActionError(this.i18n.t('ops.loadFailed'), error));
    }
  }

  setLeftMode(mode: string): void {
    this.store.setLeftMode(mode as any);
  }

  setRightMode(mode: string): void {
    this.store.setRightMode(mode as any);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private setLeftPanelContent(content: string, label: string): void {
    this.store.setRawText(content);
    this.recentDocs.push(label, content);
  }

  private toActionError(prefix: string, error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : this.i18n.t('wb.unknownError');
    return this.i18n.t('wb.actionError', { action: prefix, error: errorMessage });
  }
}
