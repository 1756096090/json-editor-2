import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { SplitPaneComponent } from '../../components/ui/split-pane/split-pane.component';
import { ToastComponent } from '../../components/ui/toast/toast.component';
import { EditorPanelComponent } from './components/editor-panel/editor-panel.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { DiffBarComponent } from './components/diff-bar/diff-bar.component';
import { LeftPanelMode, WorkbenchStore } from './state/workbench.store';
import { SettingsStore } from '../settings/settings.store';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../../shared/confirm-dialog/confirm-dialog.component';
import { SettingsPanelComponent } from '../../shared/settings-panel/settings-panel.component';
import { LiveDiffService } from './services/live-diff.service';
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
    ConfirmDialogComponent,
    SettingsPanelComponent
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

  // ── Settings panel ───────────────────────────────────────────────────────
  readonly showSettings = signal(false);

  // ── Download confirmation ────────────────────────────────────────────────
  /** true = pretty download pending; false = min download pending */
  private readonly pendingDownloadIsPretty = signal(true);
  readonly showConfirmDownload = signal(false);

  // ── Diff navigation state ────────────────────────────────────────────────────
  readonly currentHunkIndex = signal(-1);

  /** Scroll position emitted by the panel that last scrolled. */
  readonly leftScrollTop = signal(0);
  readonly rightScrollTop = signal(0);

  readonly hunks = computed(() => this.diffService.result()?.hunks ?? []);
  readonly hunkCount = computed(() => this.hunks().length);

  readonly activeHunkStart = computed(() => {
    const idx = this.currentHunkIndex();
    const h = this.hunks();
    return idx >= 0 && idx < h.length ? h[idx].startIndex : -1;
  });

  readonly activeHunkEnd = computed(() => {
    const idx = this.currentHunkIndex();
    const h = this.hunks();
    return idx >= 0 && idx < h.length ? h[idx].endIndex : -1;
  });

  constructor() {
    // Schedule diff whenever editor content changes (only when diff mode is ON)
    effect(() => {
      const left = this.store.rawText();
      const right = this.store.baselineText();
      if (this.store.showDiff()) {
        this.currentHunkIndex.set(-1);
        this.diffService.schedule(left, right);
      }
    });

    // Reset hunk cursor when number of hunks changes
    effect(
      () => {
        const count = this.hunkCount();
        const cur = this.currentHunkIndex();
        if (cur >= count) {
          this.currentHunkIndex.set(count > 0 ? count - 1 : -1);
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnDestroy(): void {
    this.diffService.clear();
  }

  // ── Diff navigation ──────────────────────────────────────────────────────────

  goToPrevHunk(): void {
    const count = this.hunkCount();
    if (count === 0) return;
    const cur = this.currentHunkIndex();
    this.currentHunkIndex.set(cur <= 0 ? count - 1 : cur - 1);
  }

  goToNextHunk(): void {
    const count = this.hunkCount();
    if (count === 0) return;
    const cur = this.currentHunkIndex();
    this.currentHunkIndex.set(cur >= count - 1 ? 0 : cur + 1);
  }

  // ── Diff toolbar handlers ────────────────────────────────────────────────────


  // ── Scroll sync ──────────────────────────────────────────────────────────────

  onLeftDiffScrolled(top: number): void {
    this.rightScrollTop.set(top);
  }

  onRightDiffScrolled(top: number): void {
    this.leftScrollTop.set(top);
  }

  // ── Editor actions ───────────────────────────────────────────────────────────

  onRawTextChanged(nextRawText: string): void {
    this.store.setRawText(nextRawText);
  }

  onFormatPressed(): void {
    const success = this.store.formatJson();
    this.store.setStatusMessage(success ? 'JSON formatted.' : 'Cannot format invalid JSON.');
  }

  onMinifyPressed(): void {
    const success = this.store.minifyJson();
    this.store.setStatusMessage(success ? 'JSON minified.' : 'Cannot minify invalid JSON.');
  }

  async onCopyPressed(): Promise<void> {
    try {
      await copyTextToClipboard(this.store.rawText());
      this.store.setStatusMessage('Copied to clipboard.');
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Copy failed', error));
    }
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

  onDownloadPrettyPressed(): void {
    if (this.settings.confirmDownloads()) {
      this.pendingDownloadIsPretty.set(true);
      this.showConfirmDownload.set(true);
    } else {
      this.executePrettyDownload();
    }
  }

  onDownloadMinPressed(): void {
    if (this.settings.confirmDownloads()) {
      this.pendingDownloadIsPretty.set(false);
      this.showConfirmDownload.set(true);
    } else {
      this.executeMinDownload();
    }
  }

  onDownloadConfirmClosed(result: ConfirmDialogResult): void {
    this.showConfirmDownload.set(false);
    if (!result.confirmed) return;
    if (result.dontAskAgain) {
      this.settings.setConfirmDownloads(false);
    }
    if (this.pendingDownloadIsPretty()) {
      this.executePrettyDownload();
    } else {
      this.executeMinDownload();
    }
  }

  private executePrettyDownload(): void {
    const text = this.store.workingPrettyText();
    if (!text) {
      this.store.setStatusMessage('No valid JSON available to download.');
      return;
    }
    downloadTextFile('json-we-format.pretty.json', text);
    this.store.setStatusMessage('Pretty JSON download started.');
  }

  private executeMinDownload(): void {
    const text = this.store.workingMinifiedText();
    if (!text) {
      this.store.setStatusMessage('No valid JSON available to download.');
      return;
    }
    downloadTextFile('json-we-format.min.json', text);
    this.store.setStatusMessage('Minified JSON download started.');
  }

  async onOpenFilePressed(): Promise<void> {
    try {
      const file = await openJsonFilePicker();
      this.store.setRawText(file.content);
      this.store.setStatusMessage(`Loaded file: ${file.fileName}`);
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Open file failed', error));
    }
  }

  async onFileDropped(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.store.setStatusMessage('Only .json files are supported.');
      return;
    }
    try {
      const text = await readFileAsText(file);
      this.store.setRawText(text);
      this.store.setStatusMessage(`Loaded file: ${file.name}`);
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Drop load failed', error));
    }
  }

  onBaselineTextChanged(text: string): void {
    this.store.setBaselineText(text);
  }

  onLeftModeChanged(mode: LeftPanelMode): void {
    this.store.setLeftMode(mode);
  }

  onRightModeChanged(mode: LeftPanelMode): void {
    this.store.setRightMode(mode);
  }

  async onBaselineFileDropped(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.store.setStatusMessage('Only .json files are supported.');
      return;
    }
    try {
      const text = await readFileAsText(file);
      this.store.setBaselineText(text);
      this.store.setStatusMessage(`Loaded file into right editor: ${file.name}`);
    } catch (error) {
      this.store.setStatusMessage(this.toActionError('Drop load failed', error));
    }
  }

  onSetBaselinePressed(): void {
    this.store.setBaselineText(this.store.rawText());
    this.store.setStatusMessage('Right editor updated from left editor.');
  }

  onResetBaselinePressed(): void {
    const success = this.store.resetToBaseline();
    this.store.setStatusMessage(success ? 'Left editor updated from right editor.' : 'Right editor is empty.');
  }

  onToggleThemePressed(): void {
    this.store.toggleTheme();
    this.store.setStatusMessage(
      this.store.themeMode() === 'dark' ? 'Dark mode enabled.' : 'Light mode enabled.'
    );
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
    if (!event.altKey || !this.store.showDiff()) return;
    if (event.key === 'ArrowUp' || event.key === 'Up') {
      event.preventDefault();
      this.goToPrevHunk();
    } else if (event.key === 'ArrowDown' || event.key === 'Down') {
      event.preventDefault();
      this.goToNextHunk();
    }
  }

  private toActionError(prefix: string, error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    return `${prefix}: ${errorMessage}`;
  }
}
