import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SplitPaneComponent } from '../../components/ui/split-pane/split-pane.component';
import { ToastComponent } from '../../components/ui/toast/toast.component';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { EditorPanelComponent } from './components/editor-panel/editor-panel.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { DiffBarComponent } from './components/diff-bar/diff-bar.component';
import { LeftPanelMode, WorkbenchStore } from './state/workbench.store';
import { SettingsStore } from '../settings/settings.store';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../../shared/confirm-dialog/confirm-dialog.component';
import { SettingsPanelComponent } from '../../shared/settings-panel/settings-panel.component';
import { LiveDiffService } from './services/live-diff.service';
import { DiffLineDecoration } from './utils/diff-engine.types';
import { TabsService } from '../../core/tabs.service';
import { TabBarComponent } from '../../components/ui/tab-bar/tab-bar.component';

// Facades
import { WorkbenchActionsFacade } from './services/workbench-actions.facade';
import { PanelOperationsFacade } from './services/panel-operations.facade';
import { KeyboardHandlerService } from './services/keyboard-handler.service';

@Component({
  selector: 'app-json-workbench',
  imports: [
    ToolbarComponent,
    DiffBarComponent,
    EditorPanelComponent,
    SplitPaneComponent,
    ToastComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    SettingsPanelComponent,
    FormsModule,
    TabBarComponent,
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
  // ── Core services ────────────────────────────────────────────────────────
  readonly store = inject(WorkbenchStore);
  readonly diffService = inject(LiveDiffService);
  readonly settings = inject(SettingsStore);

  // ── Facades ──────────────────────────────────────────────────────────────
  private readonly actions = inject(WorkbenchActionsFacade);
  private readonly operations = inject(PanelOperationsFacade);
  private readonly keyboardHandler = inject(KeyboardHandlerService);

  // ── View children ────────────────────────────────────────────────────────
  private readonly leftPanel = viewChild<EditorPanelComponent>('leftPanel');
  private readonly rightPanel = viewChild<EditorPanelComponent>('rightPanel');

  // ── Settings panel ───────────────────────────────────────────────────────
  readonly showSettings = signal(false);

  // ── Toolbar collapse ─────────────────────────────────────────────────────
  readonly toolbarCollapsed = signal(false);

  // ── Mobile layout (≤ 680 px: hide second panel, disable diff) ───────────
  readonly isMobileLayout = signal(false);

  // ── Split pane ratio (synced from SplitPaneComponent) ───────────────────
  readonly splitRatio = signal(50);

  // ── Panel labels (editable) ────────────────────────────────────────────
  readonly leftPanelLabel = signal('Input');
  readonly rightPanelLabel = signal('Output');

  // ── URL import ───────────────────────────────────────────────────────────
  readonly showUrlImport = signal(false);
  readonly urlImportValue = signal('');
  readonly urlImportLoading = signal(false);
  readonly urlImportTarget = signal<'left' | 'right'>('left');

  // ── Autosave indicator ───────────────────────────────────────────────────
  readonly lastSavedAt = signal<Date | null>(null);
  readonly autosavedLabel = computed<string>(() => {
    const d = this.lastSavedAt();
    if (!d) return '';
    return `Autosaved ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  });

  // ── Download confirmation ────────────────────────────────────────────────
  /** true = pretty download pending; false = min download pending */
  private readonly pendingDownloadIsPretty = signal(true);
  readonly showConfirmDownload = signal(false);

  // ── Diff navigation state ────────────────────────────────────────────────────
  readonly currentHunkIndex = signal(-1);

  readonly hunks = computed(() => this.diffService.result()?.hunks ?? []);
  readonly hunkCount = computed(() => this.hunks().length);

  /** Derived theme for Monaco editors. */
  readonly monacoTheme = computed<'dark' | 'light'>(() => this.store.themeMode());

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

    // Schedule diff whenever editor content changes (only when diff mode is ON)
    effect(() => {
      const baseline = this.store.baselineText();
      const working = this.store.rawText();
      if (this.store.showDiff()) {
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

    // Track last save time — the store auto-persists on every rawText change
    effect(() => {
      this.store.rawText(); // track changes
      this.lastSavedAt.set(new Date());
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

  // ── Per-panel format / minify / copy ─────────────────────────────────────────

  onFormatLeft():  void { this.actions.formatPanel('left');  }
  onFormatRight(): void { this.actions.formatPanel('right'); }
  onMinifyLeft():  void { this.actions.minifyPanel('left');  }
  onMinifyRight(): void { this.actions.minifyPanel('right'); }

  onCopyLeft  = (): Promise<void> => this.actions.copyPanel('left');
  onCopyRight = (): Promise<void> => this.actions.copyPanel('right');

  // ── Transfer between panels ──────────────────────────────────────────────────

  onCopyLeftToRight(): void { this.actions.copyLeftToRight(); }
  onCopyRightToLeft(): void { this.actions.copyRightToLeft(); }

  // ── Global toolbar actions ───────────────────────────────────────────────────

  onFormatPressed(): void {
    this.actions.formatActivePanel();
  }

  onMinifyPressed(): void {
    this.actions.minifyActivePanel();
  }

  async onCopyPressed(): Promise<void> {
    await this.actions.copyPanel(this.store.activePanel());
  }

  async onPastePressed(): Promise<void> {
    await this.actions.pasteFromClipboard();
  }

  onDownloadPrettyPressed(): void { this.triggerDownload(true);  }
  onDownloadMinPressed():   void { this.triggerDownload(false); }

  private triggerDownload(pretty: boolean): void {
    if (this.settings.confirmDownloads()) {
      this.pendingDownloadIsPretty.set(pretty);
      this.showConfirmDownload.set(true);
    } else {
      this.executeDownload(pretty);
    }
  }

  onDownloadConfirmClosed(result: ConfirmDialogResult): void {
    this.showConfirmDownload.set(false);
    if (!result.confirmed) return;
    if (result.dontAskAgain) this.settings.setConfirmDownloads(false);
    this.executeDownload(this.pendingDownloadIsPretty());
  }

  private executeDownload(pretty: boolean): void {
    try {
      const fileName = pretty ? 'json-we-format.pretty.json' : 'json-we-format.min.json';
      const label    = pretty ? 'Pretty' : 'Minified';
      
      if (pretty) {
        this.actions.downloadPrettyJson();
      } else {
        this.actions.downloadMinifiedJson();
      }
      this.store.setStatusMessage(`${label} JSON download started.`);
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Download failed', error));
    }
  }

  async onOpenFilePressed(): Promise<void> {
    await this.operations.openFileIntoActivePanel();
  }

  onFileDropped         = (file: File): Promise<void> => this.operations.loadFileIntoPanel(file, 'left');
  onBaselineFileDropped = (file: File): Promise<void> => this.operations.loadFileIntoPanel(file, 'right');

  onBaselineTextChanged(text: string): void { this.store.setBaselineText(text); }
  onLeftModeChanged(mode: LeftPanelMode):  void { this.operations.setLeftMode(mode);  }
  onRightModeChanged(mode: LeftPanelMode): void { this.operations.setRightMode(mode); }

  onSetBaselinePressed(): void {
    this.store.setBaselineText(this.store.rawText());
    this.store.setStatusMessage('Right editor updated from left editor.');
  }

  onResetBaselinePressed(): void {
    const success = this.store.resetToBaseline();
    this.store.setStatusMessage(success ? 'Left editor updated from right editor.' : 'Right editor is empty.');
  }

  onToggleSettingsPressed(): void {
    this.showSettings.update((v) => !v);
  }

  onToggleDiffPressed(): void {
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

  onImportUrlPressed(): void {
    this.showUrlImport.update((v) => !v);
    this.urlImportValue.set('');
    this.urlImportTarget.set('left');
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
    console.log('Left panel label changed:', newLabel);
    this.leftPanelLabel.set(newLabel);
  }

  onRightPanelLabelChanged(newLabel: string): void {
    console.log('Right panel label changed:', newLabel);
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
}
