import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { SplitPaneComponent } from '../../components/ui/split-pane/split-pane.component';
import { ToastComponent } from '../../components/ui/toast/toast.component';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { EditorPanelComponent } from './components/editor-panel/editor-panel.component';
import { DiffBarComponent } from './components/diff-bar/diff-bar.component';
import { ActivePanel, JsonValue, LeftPanelMode, WorkbenchStore } from './state/workbench.store';
import { SettingsStore } from '../settings/settings.store';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../../shared/confirm-dialog/confirm-dialog.component';
import { LiveDiffService } from './services/live-diff.service';
import { DiffLineDecoration } from './utils/diff-engine.types';
import { Tab, TabsService } from '../../core/tabs.service';
import { TabBarComponent } from '../../components/ui/tab-bar/tab-bar.component';
import { jsonToCsv } from './utils/convert.utils';
import { copyTextToClipboard, downloadTextFile } from './utils/file-utils';
import { IconComponent } from '../../components/ui/icon/icon.component';
import {
  JsonTranslatePanelComponent,
  type TranslateApplyEvent,
} from './components/json-translate-panel/json-translate-panel.component';
import { JsonCleanPanelComponent } from './components/json-clean-panel/json-clean-panel.component';
import type { JsonCleanOptions } from './utils/json-cleaner.utils';

// Facades
import { WorkbenchActionsFacade } from './services/workbench-actions.facade';
import { PanelOperationsFacade } from './services/panel-operations.facade';

type PanelTransferDirection = 'left-to-right' | 'right-to-left';
type WorkbenchPreset = 'default' | 'json-to-csv';

@Component({
  selector: 'app-json-workbench',
  imports: [
    DiffBarComponent,
    EditorPanelComponent,
    SplitPaneComponent,
    NgTemplateOutlet,
    ToastComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    TabBarComponent,
    IconComponent,
    JsonTranslatePanelComponent,
    JsonCleanPanelComponent,
  ],
  providers: [LiveDiffService],
  templateUrl: './json-workbench.component.html',
  styleUrl: './json-workbench.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onWindowKeydown($event)'
  }
})
export class JsonWorkbenchComponent implements OnDestroy {
  readonly preset = input<WorkbenchPreset>('default');

  // ── Core services ────────────────────────────────────────────────────────
  readonly store = inject(WorkbenchStore);
  readonly diffService = inject(LiveDiffService);
  readonly settings = inject(SettingsStore);
  readonly tabs = inject(TabsService);

  // ── Facades ──────────────────────────────────────────────────────────────
  private readonly actions = inject(WorkbenchActionsFacade);
  private readonly operations = inject(PanelOperationsFacade);

  // ── View children ────────────────────────────────────────────────────────
  private readonly leftPanel = viewChild<EditorPanelComponent>('leftPanel');
  private readonly rightPanel = viewChild<EditorPanelComponent>('rightPanel');

  // ── Mobile layout (≤ 680 px: hide second panel, disable diff) ───────────
  readonly isMobileLayout = signal(false);

  // ── Split pane ratio (synced from SplitPaneComponent) ───────────────────
  readonly splitRatio = signal(50);

  // ── Panel labels (editable) ────────────────────────────────────────────
  readonly leftPanelLabel = signal('');
  readonly rightPanelLabel = signal('');
  readonly leftDisplayTabs = computed<Tab[]>(() => this.toDisplayTabs(this.tabs.leftTabs()));
  readonly rightDisplayTabs = computed<Tab[]>(() => this.toDisplayTabs(this.tabs.rightTabs()));
  readonly isCsvConverter = computed(() => this.preset() === 'json-to-csv');
  readonly leftPanelTitle = computed(() => this.isCsvConverter() ? 'Input JSON' : '');
  readonly rightPanelTitle = computed(() => this.isCsvConverter() ? 'CSV Output' : '');
  readonly leftPanelMode = computed<LeftPanelMode>(() => this.isCsvConverter() ? 'text' : this.store.leftMode());
  readonly rightPanelMode = computed<LeftPanelMode>(() => this.isCsvConverter() ? 'csv' : this.store.rightMode());

  private readonly csvOutputJson = signal<JsonValue | null>(null);
  private readonly csvOutputSource = signal('');
  readonly csvOutputValue = computed<JsonValue | null>(() => {
    if (!this.isCsvConverter()) return this.store.baselineJson();
    return this.csvOutputSource() === this.store.rawText() ? this.csvOutputJson() : null;
  });
  readonly csvOutputText = computed(() => {
    const value = this.csvOutputValue();
    return value === null ? '' : jsonToCsv(value);
  });
  readonly hasCsvOutput = computed(() => this.csvOutputText().length > 0);

  // ── URL import ───────────────────────────────────────────────────────────
  readonly showUrlImport = signal(false);
  readonly urlImportValue = signal('');
  readonly urlImportLoading = signal(false);
  readonly urlImportTarget = signal<'left' | 'right'>('left');

  // ── Clean panel ─────────────────────────────────────────────────────────
  readonly showCleanPanel = signal(false);
  private readonly cleanSourcePanel = signal<ActivePanel>('left');
  readonly cleanJsonValue = computed<JsonValue | null>(() =>
    this.cleanSourcePanel() === 'left' ? this.store.currentJson() : this.store.baselineJson()
  );

  // ── Translate values panel ──────────────────────────────────────────────
  readonly showTranslatePanel = signal(false);
  private readonly translateSourcePanel = signal<ActivePanel>('left');
  readonly translateJsonValue = computed<JsonValue | null>(() =>
    this.translateSourcePanel() === 'left' ? this.store.workingJson() : this.store.baselineJson()
  );
  readonly translateCanSendToOther = computed(() => !this.isCsvConverter() && !this.isMobileLayout());

  readonly showConfirmPanelTransfer = signal(false);
  private readonly pendingPanelTransfer = signal<PanelTransferDirection | null>(null);
  readonly panelTransferConfirmMessage = computed(() => (
    this.pendingPanelTransfer() === 'right-to-left'
      ? 'This will replace editor A with the current content from editor B.'
      : 'This will replace editor B with the current content from editor A.'
  ));

  // ── Diff navigation state ────────────────────────────────────────────────────
  readonly currentHunkIndex = signal(-1);

  readonly hunks = computed(() => this.diffService.result()?.hunks ?? []);
  readonly hunkCount = computed(() => this.hunks().length);

  /** Derived theme for Monaco editors. */
  readonly monacoTheme = computed<'dark' | 'light'>(() => this.store.themeMode());
  readonly panelsHaveSameMode = computed(() => this.store.leftMode() === this.store.rightMode());
  readonly canComparePanels = computed(() => !this.isMobileLayout() && this.panelsHaveSameMode());
  readonly compareTooltip = computed(() => (
    this.isMobileLayout()
      ? 'Compare is available in two-panel view'
      : this.panelsHaveSameMode()
        ? 'Compare (Ctrl+Shift+D)'
        : 'Select the same type in both panels to compare'
  ));

  /** Diff decorations for each panel (empty when diff is OFF).
   * schedule(baseline, working) → leftDecorations = baseline side (Output),
   *                               rightDecorations = working side (Input).
   * We must cross-assign so each panel shows its own perspective.
   */
  readonly leftDiffDecorations = computed<DiffLineDecoration[]>(() => {
    if (!this.store.showDiff()) return [];
    return this.diffService.result()?.rightDecorations ?? []; // working = Input
  });

  readonly rightDiffDecorations = computed<DiffLineDecoration[]>(() => {
    if (!this.store.showDiff()) return [];
    return this.diffService.result()?.leftDecorations ?? []; // baseline = Output
  });

  constructor() {
    // ── Mobile layout detection ────────────────────────────────────────────
    const mql = window.matchMedia('(max-width: 680px)');
    this.isMobileLayout.set(mql.matches);
    const mqlHandler = (e: MediaQueryListEvent) => this.isMobileLayout.set(e.matches);
    mql.addEventListener('change', mqlHandler);
    inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', mqlHandler));

    // Restore split ratio from storage so tab bar is aligned on first paint
    try {
      const stored = localStorage.getItem('json-we-format:split-ratio');
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= 20 && val <= 80) this.splitRatio.set(val);
      }
    } catch { /* ignore */ }

    // Auto-close diff when switching to single-panel mobile view
    effect(() => {
      if (this.isMobileLayout() && this.store.showDiff()) {
        this.store.showDiff.set(false);
      }
    });

    effect(() => {
      if (this.isCsvConverter()) {
        this.store.setLeftMode('text');
        this.store.setRightMode('csv');
        this.store.showDiff.set(false);
      }
    });

    effect(() => {
      if (this.store.showDiff() && !this.panelsHaveSameMode()) {
        this.store.showDiff.set(false);
        this.diffService.clear();
        this.currentHunkIndex.set(-1);
        this.store.setStatusMessage('Compare is only available when both panels use the same type.');
      }
    });

    // Schedule diff whenever editor content changes (only when diff mode is ON)
    effect(() => {
      const baseline = this.store.baselineText();
      const working = this.store.rawText();
      if (this.store.showDiff() && this.panelsHaveSameMode()) {
        this.currentHunkIndex.set(-1);
        this.diffService.schedule(baseline, working);
      }
    });

    // Reset hunk cursor when number of hunks changes
    effect(() => {
      const count = this.hunkCount();
      const cur = this.currentHunkIndex();
      if (cur >= count) {
        this.currentHunkIndex.set(count > 0 ? count - 1 : -1);
      }
    });
  }

  ngOnDestroy(): void {
    this.diffService.clear();
  }

  // ── Diff navigation ──────────────────────────────────────────────────────────

  goToPrevHunk(): void { this.navigateHunk(-1); }
  goToNextHunk(): void  { this.navigateHunk(1);  }

  private navigateHunk(direction: 1 | -1): void {
    const count = this.hunkCount();
    if (count === 0) return;
    const cur = this.currentHunkIndex();
    const idx = direction === 1
      ? (cur >= count - 1 ? 0       : cur + 1)
      : (cur <= 0         ? count - 1 : cur - 1);
    this.currentHunkIndex.set(idx);
    this.scrollToHunk(idx);
  }

  private scrollToHunk(idx: number): void {
    const hunk = this.hunks()[idx];
    if (!hunk) return;
    this.leftPanel()?.jumpTo(hunk.leftLine, 1);
    this.rightPanel()?.jumpTo(hunk.rightLine, 1);
  }

  // ── Active panel ─────────────────────────────────────────────────────────────

  onLeftPanelFocused(): void {
    this.store.setActivePanel('left');
  }

  onRightPanelFocused(): void {
    this.store.setActivePanel('right');
  }

  // ── Editor actions ───────────────────────────────────────────────────────────

  onRawTextChanged(nextRawText: string): void {
    this.store.setRawText(nextRawText);
  }

  onConvertToCsv(): void {
    const json = this.store.currentJson();
    if (json === null) {
      this.csvOutputJson.set(null);
      this.csvOutputSource.set('');
      this.store.setStatusMessage('Paste valid JSON before converting to CSV.');
      return;
    }

    this.csvOutputJson.set(json);
    this.csvOutputSource.set(this.store.rawText());
    const rows = this.csvOutputText().split('\n').filter(Boolean).length;
    this.store.setStatusMessage(`CSV ready. ${rows} ${rows === 1 ? 'row' : 'rows'} generated.`);
  }

  async onCopyCsvOutput(): Promise<void> {
    const csv = this.csvOutputText();
    if (!csv) {
      this.store.setStatusMessage('Convert valid JSON before copying CSV.');
      return;
    }

    try {
      await copyTextToClipboard(csv);
      this.store.setStatusMessage('CSV copied to clipboard.');
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Copy CSV failed', error));
    }
  }

  onDownloadCsvOutput(): void {
    const csv = this.csvOutputText();
    if (!csv) {
      this.store.setStatusMessage('Convert valid JSON before downloading CSV.');
      return;
    }

    downloadTextFile('output.csv', csv, 'text/csv');
    this.store.setStatusMessage('CSV download started.');
  }

  // ── Per-panel format / minify / copy ─────────────────────────────────────────

  onFormatPanel(panel: ActivePanel): void {
    this.store.setActivePanel(panel);
    this.actions.formatPanel(panel);
  }

  onMinifyPanel(panel: ActivePanel): void {
    this.store.setActivePanel(panel);
    this.actions.minifyPanel(panel);
  }

  onCleanPanel(panel: ActivePanel): void {
    this.store.setActivePanel(panel);
    const json = panel === 'left' ? this.store.currentJson() : this.store.baselineJson();
    if (json === null) {
      this.store.setStatusMessage('Cannot clean invalid JSON.');
      return;
    }
    this.cleanSourcePanel.set(panel);
    this.showCleanPanel.set(true);
  }

  onCleanApplied(options: JsonCleanOptions): void {
    this.actions.cleanPanelWith(this.cleanSourcePanel(), options);
  }

  onCleanClosed(): void {
    this.showCleanPanel.set(false);
  }

  onSortPanel(panel: ActivePanel): void {
    this.store.setActivePanel(panel);
    this.actions.sortPanel(panel);
  }

  isJsonPanel(panel: ActivePanel): boolean {
    return panel === 'left'
      ? this.store.leftMode() === 'text'
      : this.store.rightMode() === 'text';
  }

  // ── Translate values ─────────────────────────────────────────────────────

  onTranslatePressed(panel: ActivePanel): void {
    this.store.setActivePanel(panel);
    const json = panel === 'left' ? this.store.workingJson() : this.store.baselineJson();
    if (json === null) {
      this.store.setStatusMessage('Paste valid JSON before translating.');
      return;
    }
    this.translateSourcePanel.set(panel);
    this.showTranslatePanel.set(true);
  }

  onTranslateApplied(event: TranslateApplyEvent): void {
    const source = this.translateSourcePanel();
    const writeToLeft =
      event.target === 'same' ? source === 'left' : source !== 'left';

    if (writeToLeft) {
      this.store.setRawText(event.text);
    } else {
      this.store.setBaselineText(event.text);
    }
    this.store.setStatusMessage(
      event.target === 'same' ? 'Translation applied.' : 'Translation sent to the other panel.'
    );
  }

  onTranslateClosed(): void {
    this.showTranslatePanel.set(false);
  }

  onPanelStatus(message: string): void {
    this.store.setStatusMessage(message);
  }

  // ── Transfer between panels ──────────────────────────────────────────────────

  onCopyLeftToRight(): void { this.confirmPanelTransfer('left-to-right'); }
  onCopyRightToLeft(): void { this.confirmPanelTransfer('right-to-left'); }

  private confirmPanelTransfer(direction: PanelTransferDirection): void {
    if (this.settings.confirmPanelTransfers()) {
      this.pendingPanelTransfer.set(direction);
      this.showConfirmPanelTransfer.set(true);
      return;
    }

    this.executePanelTransfer(direction);
  }

  onPanelTransferConfirmClosed(result: ConfirmDialogResult): void {
    this.showConfirmPanelTransfer.set(false);
    const direction = this.pendingPanelTransfer();
    this.pendingPanelTransfer.set(null);

    if (!result.confirmed || !direction) return;
    if (result.dontAskAgain) this.settings.setConfirmPanelTransfers(false);
    this.executePanelTransfer(direction);
  }

  private executePanelTransfer(direction: PanelTransferDirection): void {
    if (direction === 'left-to-right') {
      this.actions.copyLeftToRight();
      return;
    }

    this.actions.copyRightToLeft();
  }

  async onOpenFilePressed(panel: ActivePanel = this.store.activePanel()): Promise<void> {
    this.store.setActivePanel(panel);
    await this.operations.openFileIntoPanel(panel);
  }

  onFileDropped         = (file: File): Promise<void> => this.operations.loadFileIntoPanel(file, 'left');
  onBaselineFileDropped = (file: File): Promise<void> => this.operations.loadFileIntoPanel(file, 'right');

  onBaselineTextChanged(text: string): void { this.store.setBaselineText(text); }
  onLeftModeChanged(mode: LeftPanelMode):  void { this.operations.setLeftMode(mode);  }
  onRightModeChanged(mode: LeftPanelMode): void {
    if (this.isCsvConverter()) return;
    this.operations.setRightMode(mode);
  }

  onToggleDiffPressed(): void {
    if (this.isCsvConverter()) return;
    if (!this.store.showDiff() && !this.canComparePanels()) {
      this.store.setStatusMessage('Choose the same type in both panels before comparing.');
      return;
    }

    this.store.toggleDiff();
    if (!this.store.showDiff()) {
      this.diffService.clear();
      this.currentHunkIndex.set(-1);
    }
  }

  onWindowKeydown(event: KeyboardEvent): void {
    const hasCommand = event.ctrlKey || event.metaKey;

    // Ctrl+F → open Monaco find widget in the active panel
    if (hasCommand && !event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      const panel = this.store.activePanel() === 'left' ? this.leftPanel() : this.rightPanel();
      panel?.openFind();
      return;
    }

    // Alt+↑/↓ in diff mode
    if (event.altKey && this.store.showDiff()) {
      if (event.key === 'ArrowUp' || event.key === 'Up') {
        event.preventDefault();
        this.goToPrevHunk();
      } else if (event.key === 'ArrowDown' || event.key === 'Down') {
        event.preventDefault();
        this.goToNextHunk();
      }
    }
  }

  // ── URL import ────────────────────────────────────────────────────────────

  onImportUrlPressed(panel: ActivePanel = this.store.activePanel()): void {
    const target = this.isCsvConverter() ? 'left' : panel;
    this.store.setActivePanel(target);
    this.showUrlImport.update((v) => !v);
    this.urlImportValue.set('');
    this.urlImportTarget.set(target);
  }

  async onUrlImportSubmit(): Promise<void> {
    const rawUrl = this.urlImportValue().trim();
    if (!rawUrl) return;

    this.urlImportLoading.set(true);
    try {
      await this.operations.loadFromUrl(rawUrl, this.urlImportTarget());
      this.showUrlImport.set(false);
      this.urlImportValue.set('');
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('URL import failed', error));
    } finally {
      this.urlImportLoading.set(false);
    }
  }

  onUrlImportCancel(): void {
    this.showUrlImport.set(false);
    this.urlImportValue.set('');
    this.urlImportTarget.set('left');
  }

  // ── Tab operations ────────────────────────────────────────────────────────

  onLeftTabSwitch(newId: string): void {
    this.operations.switchLeftTab(newId);
  }

  onRightTabSwitch(newId: string): void {
    this.operations.switchRightTab(newId);
  }

  onAddLeftTab(): void {
    this.operations.addLeftTab();
  }

  onAddRightTab(): void {
    this.operations.addRightTab();
  }

  onLeftTabClose(id: string): void {
    this.operations.closeLeftTab(id);
  }

  onRightTabClose(id: string): void {
    this.operations.closeRightTab(id);
  }

  // ── Panel label operations ─────────────────────────────────────────────

  onLeftPanelLabelChanged(newLabel: string): void {
    this.leftPanelLabel.set(newLabel);
  }

  onRightPanelLabelChanged(newLabel: string): void {
    this.rightPanelLabel.set(newLabel);
  }

  onSwapPanels(): void {
    const result = this.actions.swapPanels(this.leftPanelLabel(), this.rightPanelLabel());
    this.leftPanelLabel.set(result.newLeftLabel);
    this.rightPanelLabel.set(result.newRightLabel);
  }

  private toActionError(prefix: string, error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    return `${prefix}: ${errorMessage}`;
  }

  private toDisplayTabs(tabs: Tab[]): Tab[] {
    if (this.isCsvConverter()) {
      return tabs;
    }

    return tabs.map((tab, index) => ({
      ...tab,
      label: /^(Input|Output)\s+\d+$/i.test(tab.label) ? `Doc ${index + 1}` : tab.label,
    }));
  }
}
