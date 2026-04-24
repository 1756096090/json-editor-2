import { Injectable, inject } from '@angular/core';
import { WorkbenchStore } from '../state/workbench.store';
import { TabsService } from '../../../core/tabs.service';
import { copyTextToClipboard, downloadTextFile, readTextFromClipboard } from '../utils/file-utils';

/**
 * Facade for common editor actions (format, minify, copy, download).
 * Reduces boilerplate in JsonWorkbenchComponent.
 */
@Injectable({ providedIn: 'root' })
export class WorkbenchActionsFacade {
  private readonly store = inject(WorkbenchStore);
  private readonly tabs = inject(TabsService);

  /** Format JSON in active panel */
  formatActivePanel(): boolean {
    const success = this.store.formatActivePanel();
    const msg = success ? 'JSON formatted.' : 'Cannot format invalid JSON.';
    this.store.setStatusMessage(msg);
    return success;
  }

  /** Minify JSON in active panel */
  minifyActivePanel(): boolean {
    const success = this.store.minifyActivePanel();
    const msg = success ? 'JSON minified.' : 'Cannot minify invalid JSON.';
    this.store.setStatusMessage(msg);
    return success;
  }

  /** Format JSON in specific panel */
  formatPanel(panel: 'left' | 'right'): boolean {
    const success = panel === 'left'
      ? this.store.formatJson()
      : this.store.formatBaselineJson();
    const label = panel === 'left' ? 'Input' : 'Output';
    const msg = success ? `${label} formatted.` : `Cannot format invalid JSON.`;
    this.store.setStatusMessage(msg);
    return success;
  }

  /** Minify JSON in specific panel */
  minifyPanel(panel: 'left' | 'right'): boolean {
    const success = panel === 'left'
      ? this.store.minifyJson()
      : this.store.minifyBaselineJson();
    const label = panel === 'left' ? 'Input' : 'Output';
    const msg = success ? `${label} minified.` : `Cannot minify invalid JSON.`;
    this.store.setStatusMessage(msg);
    return success;
  }

  /** Copy panel content to clipboard */
  async copyPanel(panel: 'left' | 'right'): Promise<void> {
    const text = panel === 'left' ? this.store.rawText() : this.store.baselineText();
    const label = panel === 'left' ? 'Input' : 'Output';
    try {
      await copyTextToClipboard(text);
      this.store.setStatusMessage(`${label} copied to clipboard.`);
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Copy failed', error));
    }
  }

  /** Copy from clipboard to active panel */
  async pasteFromClipboard(): Promise<void> {
    try {
      const text = await readTextFromClipboard();
      this.store.setRawText(text);
      this.store.setStatusMessage('Pasted from clipboard.');
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Paste failed', error));
    }
  }

  /** Download formatted JSON */
  downloadPrettyJson(): void {
    const text = this.store.workingPrettyText();
    if (!text) {
      this.store.setStatusMessage('No valid JSON available to download.');
      return;
    }
    downloadTextFile('json-we-format.pretty.json', text);
    this.store.setStatusMessage('Pretty JSON download started.');
  }

  /** Download minified JSON */
  downloadMinifiedJson(): void {
    const text = this.store.workingMinifiedText();
    if (!text) {
      this.store.setStatusMessage('No valid JSON available to download.');
      return;
    }
    downloadTextFile('json-we-format.min.json', text);
    this.store.setStatusMessage('Minified JSON download started.');
  }

  /** Transfer left panel content to right */
  copyLeftToRight(): void {
    this.store.setBaselineText(this.store.rawText());
    this.store.setStatusMessage('Input copied to Output.');
  }

  /** Transfer right panel content to left */
  copyRightToLeft(): void {
    this.store.setRawText(this.store.baselineText());
    this.store.setStatusMessage('Output copied to Input.');
  }

  /** Swap left and right panel content & labels */
  swapPanels(leftLabel: string, rightLabel: string): { newLeftLabel: string; newRightLabel: string } {
    // Swap store content
    const tempLeftText = this.store.rawText();
    const tempLeftMode = this.store.leftMode();

    this.store.setRawText(this.store.baselineText());
    this.store.setLeftMode(this.store.rightMode());

    this.store.setBaselineText(tempLeftText);
    this.store.setRightMode(tempLeftMode);

    // Swap tabs
    this.tabs.swapTabs();

    // Return swapped labels for parent to apply
    return {
      newLeftLabel: rightLabel,
      newRightLabel: leftLabel
    };
  }

  private toActionError(prefix: string, error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    return `${prefix}: ${errorMessage}`;
  }
}
