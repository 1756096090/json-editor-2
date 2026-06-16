import { Injectable, inject } from '@angular/core';
import { WorkbenchStore } from '../state/workbench.store';
import type { ActivePanel, JsonValue } from '../state/workbench.store';
import { TabsService } from '../../../core/tabs.service';
import {
  cleanJson,
  countJsonEntries,
  DEFAULT_JSON_CLEAN_OPTIONS,
  type JsonCleanOptions,
} from '../utils/json-cleaner.utils';
import { sortJsonKeys } from '../utils/json-sort.utils';

/**
 * Facade for common editor actions (format, minify, clean, transfer, swap).
 * Reduces boilerplate in JsonWorkbenchComponent.
 */
@Injectable({ providedIn: 'root' })
export class WorkbenchActionsFacade {
  private readonly store = inject(WorkbenchStore);
  private readonly tabs = inject(TabsService);

  /** Format JSON in specific panel */
  formatPanel(panel: ActivePanel): boolean {
    const success = panel === 'left'
      ? this.store.formatJson()
      : this.store.formatBaselineJson();
    const label = panel === 'left' ? 'Input' : 'Output';
    const msg = success ? `${label} formatted.` : `Cannot format invalid JSON.`;
    this.store.setStatusMessage(msg);
    return success;
  }

  /** Minify JSON in specific panel */
  minifyPanel(panel: ActivePanel): boolean {
    const success = panel === 'left'
      ? this.store.minifyJson()
      : this.store.minifyBaselineJson();
    const label = panel === 'left' ? 'Input' : 'Output';
    const msg = success ? `${label} minified.` : `Cannot minify invalid JSON.`;
    this.store.setStatusMessage(msg);
    return success;
  }

  cleanPanel(panel: ActivePanel): boolean {
    return this.cleanPanelWith(panel, DEFAULT_JSON_CLEAN_OPTIONS);
  }

  /** Clean a panel using a caller-provided set of options. */
  cleanPanelWith(panel: ActivePanel, options: JsonCleanOptions): boolean {
    const json = panel === 'left' ? this.store.currentJson() : this.store.baselineJson();
    const label = panel === 'left' ? 'Input' : 'Output';
    if (json === null) {
      this.store.setStatusMessage('Cannot clean invalid JSON.');
      return false;
    }

    const before = countJsonEntries(json);
    const fallback: JsonValue = Array.isArray(json) ? [] : {};
    const result = cleanJson(json, options) ?? fallback;
    const removed = before - countJsonEntries(result);
    const nextText = JSON.stringify(result, null, 2);

    if (panel === 'left') {
      this.store.setRawText(nextText);
    } else {
      this.store.setBaselineText(nextText);
    }

    this.store.setStatusMessage(
      removed > 0
        ? `${label} cleaned. Removed ${removed} empty ${removed === 1 ? 'value' : 'values'}.`
        : `${label} cleaned. Nothing to remove.`,
    );
    return true;
  }

  sortPanel(panel: ActivePanel): boolean {
    const json = panel === 'left' ? this.store.currentJson() : this.store.baselineJson();
    const label = panel === 'left' ? 'Input' : 'Output';
    if (json === null) {
      this.store.setStatusMessage('Cannot sort invalid JSON.');
      return false;
    }

    const sorted = sortJsonKeys(json);
    const nextText = JSON.stringify(sorted, null, 2);

    if (panel === 'left') {
      this.store.setRawText(nextText);
    } else {
      this.store.setBaselineText(nextText);
    }

    this.store.setStatusMessage(`${label} keys sorted alphabetically.`);
    return true;
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
}
