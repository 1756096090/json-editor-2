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
import { I18nService } from '../../../core/i18n/i18n.service';

/**
 * Facade for common editor actions (format, minify, clean, transfer, swap).
 * Reduces boilerplate in JsonWorkbenchComponent.
 */
@Injectable({ providedIn: 'root' })
export class WorkbenchActionsFacade {
  private readonly store = inject(WorkbenchStore);
  private readonly tabs = inject(TabsService);
  private readonly i18n = inject(I18nService);

  private panelName(panel: ActivePanel): string {
    return this.i18n.t(panel === 'left' ? 'panel.input' : 'panel.output');
  }

  /** Format JSON in specific panel */
  formatPanel(panel: ActivePanel): boolean {
    const success = panel === 'left'
      ? this.store.formatJson()
      : this.store.formatBaselineJson();
    const msg = success
      ? this.i18n.t('act.formatted', { panel: this.panelName(panel) })
      : this.i18n.t('act.cannotFormat');
    this.store.setStatusMessage(msg);
    return success;
  }

  /** Minify JSON in specific panel */
  minifyPanel(panel: ActivePanel): boolean {
    const success = panel === 'left'
      ? this.store.minifyJson()
      : this.store.minifyBaselineJson();
    const msg = success
      ? this.i18n.t('act.minified', { panel: this.panelName(panel) })
      : this.i18n.t('act.cannotMinify');
    this.store.setStatusMessage(msg);
    return success;
  }

  cleanPanel(panel: ActivePanel): boolean {
    return this.cleanPanelWith(panel, DEFAULT_JSON_CLEAN_OPTIONS);
  }

  /** Clean a panel using a caller-provided set of options. */
  cleanPanelWith(panel: ActivePanel, options: JsonCleanOptions): boolean {
    const json = panel === 'left' ? this.store.currentJson() : this.store.baselineJson();
    const label = this.panelName(panel);
    if (json === null) {
      this.store.setStatusMessage(this.i18n.t('wb.cannotClean'));
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
        ? this.i18n.t(removed === 1 ? 'act.cleanedOne' : 'act.cleanedMany', { panel: label, n: removed })
        : this.i18n.t('act.cleanedNothing', { panel: label }),
    );
    return true;
  }

  sortPanel(panel: ActivePanel): boolean {
    const json = panel === 'left' ? this.store.currentJson() : this.store.baselineJson();
    const label = this.panelName(panel);
    if (json === null) {
      this.store.setStatusMessage(this.i18n.t('act.cannotSort'));
      return false;
    }

    const sorted = sortJsonKeys(json);
    const nextText = JSON.stringify(sorted, null, 2);

    if (panel === 'left') {
      this.store.setRawText(nextText);
    } else {
      this.store.setBaselineText(nextText);
    }

    this.store.setStatusMessage(this.i18n.t('act.sorted', { panel: label }));
    return true;
  }

  /** Transfer left panel content to right */
  copyLeftToRight(): void {
    this.store.setBaselineText(this.store.rawText());
    this.store.setStatusMessage(this.i18n.t('act.copiedInToOut'));
  }

  /** Transfer right panel content to left */
  copyRightToLeft(): void {
    this.store.setRawText(this.store.baselineText());
    this.store.setStatusMessage(this.i18n.t('act.copiedOutToIn'));
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
