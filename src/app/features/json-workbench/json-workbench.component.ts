import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SplitPaneComponent } from '../../components/ui/split-pane/split-pane.component';
import { ToastComponent } from '../../components/ui/toast/toast.component';
import { DiffPanelComponent } from './components/diff-panel/diff-panel.component';
import { EditorPanelComponent } from './components/editor-panel/editor-panel.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { LeftPanelMode, WorkbenchStore } from './state/workbench.store';
import {
  copyTextToClipboard,
  downloadTextFile,
  openJsonFilePicker,
  readFileAsText,
  readTextFromClipboard
} from './utils/file-utils';

@Component({
  selector: 'app-json-workbench',
  imports: [ToolbarComponent, EditorPanelComponent, DiffPanelComponent, SplitPaneComponent, ToastComponent],
  templateUrl: './json-workbench.component.html',
  styleUrl: './json-workbench.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonWorkbenchComponent {
  readonly store = inject(WorkbenchStore);
  readonly showDiff = signal(false);

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
    const text = this.store.workingPrettyText();
    if (!text) {
      this.store.setStatusMessage('No valid JSON available to download.');
      return;
    }

    downloadTextFile('json-we-format.pretty.json', text);
    this.store.setStatusMessage('Pretty JSON download started.');
  }

  onDownloadMinPressed(): void {
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

  onToggleDiffPressed(): void {
    this.showDiff.update((v) => !v);
  }

  private toActionError(prefix: string, error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    return `${prefix}: ${errorMessage}`;
  }
}
