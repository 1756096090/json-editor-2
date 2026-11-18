import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { EditorTextComponent } from '../../json-workbench/components/editor-text/editor-text.component';
import { SplitPaneComponent } from '../../../components/ui/split-pane/split-pane.component';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { IconComponent } from '../../../components/ui/icon/icon.component';
import { SettingsStore } from '../../settings/settings.store';
import { copyTextToClipboard } from '../../json-workbench/utils/file-utils';
import { WorkbenchStore } from '../../json-workbench/state/workbench.store';
import { evaluateJsonPath, PathResult } from './json-path';
import { completeJsonPath } from './json-path-completions';
import { TabsService } from '../../../core/tabs.service';
import { getJsonError } from '../../../core/json-error.utils';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-json-path-tester',
  imports: [TranslatePipe, EditorTextComponent, SplitPaneComponent, ButtonComponent, IconComponent],
  templateUrl: './json-path-tester.component.html',
  styleUrl: './json-path-tester.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonPathTesterComponent {
  protected readonly i18n = inject(I18nService);
  readonly store = inject(WorkbenchStore);
  readonly settings = inject(SettingsStore);
  readonly tabs = inject(TabsService);
  readonly selectedDocument = signal(`${this.store.activePanel()}:${this.store.activePanel() === 'left' ? this.tabs.leftActiveId() : this.tabs.rightActiveId()}`);
  readonly sourceText = signal(this.store.activePanel() === 'left' ? this.store.rawText() : this.store.baselineText());
  readonly sourceError = computed(() => this.sourceText().trim() ? getJsonError(this.sourceText()) : null);
  private readonly drafts = new Map<string, string>();
  readonly documents = computed(() => [
    ...this.tabs.leftTabs().map(tab => ({ key: `left:${tab.id}`, label: `A · ${tab.label}` })),
    ...this.tabs.rightTabs().map(tab => ({ key: `right:${tab.id}`, label: `B · ${tab.label}` })),
  ]);

  selectDocument(key: string): void {
    if (key === this.selectedDocument() || !this.documents().some(doc => doc.key === key)) return;
    this.drafts.set(this.selectedDocument(), this.sourceText());
    const separator = key.indexOf(':');
    const panel = key.slice(0, separator);
    const id = key.slice(separator + 1);
    const content = this.drafts.get(key) ?? (panel === 'left'
      ? (id === this.tabs.leftActiveId() ? this.store.rawText() : this.tabs.getLeftContent(id))
      : (id === this.tabs.rightActiveId() ? this.store.baselineText() : this.tabs.getRightContent(id)));
    this.selectedDocument.set(key);
    this.sourceText.set(content);
    this.copyStatus.set('');
  }
  readonly copyStatus = signal('');
  readonly resultText = computed(() => JSON.stringify(this.results().map(result => result.value), null, 2));

  async copyResults(): Promise<void> {
    try {
      await copyTextToClipboard(this.resultText());
      this.copyStatus.set(this.i18n.t('pt.copied'));
    } catch {
      this.copyStatus.set(this.i18n.t('pt.copyFailed'));
    }
  }

  formatInput(): void {
    try { this.sourceText.set(JSON.stringify(JSON.parse(this.sourceText()), null, 2)); }
    catch { /* The validation message identifies invalid input. */ }
  }

  readonly expression = signal('$');
  readonly suggestions = computed(() => completeJsonPath(this.sourceText(), this.expression()));
  readonly evaluation = computed<{ matches: PathResult[]; message: string }>(() => {
    const expression = this.expression().trim();
    const source = this.sourceText();
    if (!source.trim()) return { matches: [], message: this.i18n.t('pt.pasteJson') };
    let json: unknown;
    try { json = JSON.parse(source); }
    catch { return { matches: [], message: this.i18n.t('pt.invalidJson') }; }
    if (!expression) return { matches: [], message: this.i18n.t('pt.enterExpr') };
    try {
      const matches = evaluateJsonPath(json, expression);
      return { matches, message: matches.length ? '' : this.i18n.t('pt.noMatches') };
    } catch (error) {
      return { matches: [], message: error instanceof Error ? error.message : this.i18n.t('pt.evalError') };
    }
  });
  readonly results = computed(() => this.evaluation().matches);
  readonly statusMsg = computed(() => this.evaluation().message);
  readonly examples = ['$', '$.*', '$..name', '$[0]', '$[0:3]'];
  constructor() {
    inject(Title).setTitle('JSONPath Tester — Query JSON Interactively | JSON Hunt');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Test JSONPath expressions interactively. Paste JSON and write a JSONPath query to see matching values instantly. Free online JSONPath evaluator.',
    });
  }

  stringify(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }
}
