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
import { RecentDocsService } from '../../core/recent-docs.service';
import { TabsService } from '../../core/tabs.service';
import { TabBarComponent } from '../../components/ui/tab-bar/tab-bar.component';
import {
  copyTextToClipboard,
  downloadTextFile,
  openJsonFilePicker,
  readFileAsText,
  readTextFromClipboard
} from './utils/file-utils';

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
  readonly store = inject(WorkbenchStore);
  readonly diffService = inject(LiveDiffService);
  readonly settings = inject(SettingsStore);
  private readonly recentDocs = inject(RecentDocsService);
  readonly tabs = inject(TabsService);

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

  onFormatLeft(): void {
    const success = this.store.formatJson();
    this.store.setStatusMessage(success ? 'Input formatted.' : 'Cannot format invalid JSON.');
  }

  onFormatRight(): void {
    const success = this.store.formatBaselineJson();
    this.store.setStatusMessage(success ? 'Output formatted.' : 'Cannot format invalid JSON.');
  }

  onMinifyLeft(): void {
    const success = this.store.minifyJson();
    this.store.setStatusMessage(success ? 'Input minified.' : 'Cannot minify invalid JSON.');
  }

  onMinifyRight(): void {
    const success = this.store.minifyBaselineJson();
    this.store.setStatusMessage(success ? 'Output minified.' : 'Cannot minify invalid JSON.');
  }

  onCopyLeft  = (): Promise<void> => this.copyPanel('left');
  onCopyRight = (): Promise<void> => this.copyPanel('right');

  private async copyPanel(panel: 'left' | 'right'): Promise<void> {
    const text  = panel === 'left' ? this.store.rawText()      : this.store.baselineText();
    const label = panel === 'left' ? 'Input'                   : 'Output';
    try {
      await copyTextToClipboard(text);
      this.store.setStatusMessage(`${label} copied to clipboard.`);
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Copy failed', error));
    }
  }

  // ── Transfer between panels ──────────────────────────────────────────────────

  onCopyLeftToRight(): void {
    this.store.setBaselineText(this.store.rawText());
    this.store.setStatusMessage('Input copied to Output.');
  }

  onCopyRightToLeft(): void {
    this.store.setRawText(this.store.baselineText());
    this.store.setStatusMessage('Output copied to Input.');
  }

  // ── Global toolbar actions ───────────────────────────────────────────────────

  onFormatPressed(): void {
    const success = this.store.formatActivePanel();
    this.store.setStatusMessage(success ? 'JSON formatted.' : 'Cannot format invalid JSON.');
  }

  onMinifyPressed(): void {
    const success = this.store.minifyActivePanel();
    this.store.setStatusMessage(success ? 'JSON minified.' : 'Cannot minify invalid JSON.');
  }

  async onCopyPressed(): Promise<void> {
    await this.copyPanel(this.store.activePanel());
  }

  async onPastePressed(): Promise<void> {
    try {
      const text = await readTextFromClipboard();
      this.store.setRawText(text);
      this.store.setStatusMessage('Pasted from clipboard.');
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Paste failed', error));
    }
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
    const text     = pretty ? this.store.workingPrettyText()    : this.store.workingMinifiedText();
    const fileName = pretty ? 'json-we-format.pretty.json'      : 'json-we-format.min.json';
    const label    = pretty ? 'Pretty'                          : 'Minified';
    if (!text) {
      this.store.setStatusMessage('No valid JSON available to download.');
      return;
    }
    downloadTextFile(fileName, text);
    this.store.setStatusMessage(`${label} JSON download started.`);
  }

  async onOpenFilePressed(): Promise<void> {
    try {
      const file = await openJsonFilePicker();
      if (this.store.activePanel() === 'right') {
        this.store.setBaselineText(file.content);
      } else {
        this.setLeftPanelContent(file.content, file.fileName);
      }
      this.store.setStatusMessage(`Loaded file: ${file.fileName}`);
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Open file failed', error));
    }
  }

  onFileDropped         = (file: File): Promise<void> => this.loadFileIntoPanel(file, 'left');
  onBaselineFileDropped = (file: File): Promise<void> => this.loadFileIntoPanel(file, 'right');

  private async loadFileIntoPanel(file: File, target: 'left' | 'right'): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.store.setStatusMessage('Only .json files are supported.');
      return;
    }
    try {
      const text = await readFileAsText(file);
      if (target === 'left') {
        this.setLeftPanelContent(text, file.name);
        this.store.setStatusMessage(`Loaded file: ${file.name}`);
      } else {
        this.store.setBaselineText(text);
        this.store.setStatusMessage(`Loaded file into right editor: ${file.name}`);
      }
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Drop load failed', error));
    }
  }

  private setLeftPanelContent(content: string, label: string): void {
    this.store.setRawText(content);
    this.recentDocs.push(label, content);
  }

  onBaselineTextChanged(text: string): void { this.store.setBaselineText(text); }
  onLeftModeChanged(mode: LeftPanelMode):  void { this.store.setLeftMode(mode);  }
  onRightModeChanged(mode: LeftPanelMode): void { this.store.setRightMode(mode); }

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

    const url = this.parseHttpUrl(rawUrl);
    if (!url) {
      this.store.setStatusMessage('Invalid URL — must start with http:// or https://');
      return;
    }

    this.urlImportLoading.set(true);
    try {
      const response = await fetch(rawUrl);
      if (!response.ok) {
        this.store.setStatusMessage(`HTTP ${response.status}: ${response.statusText}`);
        return;
      }
      const text = await response.text();
      JSON.parse(text); // validate JSON before loading
      const sizeKb = (new TextEncoder().encode(text).length / 1024).toFixed(1);
      if (this.urlImportTarget() === 'right') {
        this.store.setBaselineText(text);
      } else {
        this.setLeftPanelContent(text, url.hostname + url.pathname);
      }
      this.showUrlImport.set(false);
      this.urlImportValue.set('');
      this.store.setStatusMessage(`Loaded from URL — ${sizeKb} KB`);
    } catch (error) {
      const msg = error instanceof SyntaxError
        ? 'Response is not valid JSON.'
        : this.toActionError('URL import failed', error);
      this.store.setStatusMessage(msg);
    } finally {
      this.urlImportLoading.set(false);
    }
  }

  private parseHttpUrl(rawUrl: string): URL | null {
    try {
      const url = new URL(rawUrl);
      return (url.protocol === 'http:' || url.protocol === 'https:') ? url : null;
    } catch {
      return null;
    }
  }

  onUrlImportCancel(): void {
    this.showUrlImport.set(false);
    this.urlImportValue.set('');
    this.urlImportTarget.set('left');
  }

  // ── Tab operations ────────────────────────────────────────────────────────

  onLeftTabSwitch(newId: string): void {
    const content = this.tabs.switchLeft(newId, this.store.rawText());
    this.store.setRawText(content);
  }

  onRightTabSwitch(newId: string): void {
    const content = this.tabs.switchRight(newId, this.store.baselineText());
    this.store.setBaselineText(content);
  }

  onAddLeftTab(): void {
    this.tabs.addLeftTab(this.store.rawText());
    this.store.setRawText('');
  }

  onAddRightTab(): void {
    this.tabs.addRightTab(this.store.baselineText());
    this.store.setBaselineText('');
  }

  onLeftTabClose(id: string): void {
    const next = this.tabs.closeLeftTab(id, this.store.rawText());
    if (next !== null) this.store.setRawText(next);
  }

  onRightTabClose(id: string): void {
    const next = this.tabs.closeRightTab(id, this.store.baselineText());
    if (next !== null) this.store.setBaselineText(next);
  }

  private toActionError(prefix: string, error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    return `${prefix}: ${errorMessage}`;
  }
}
