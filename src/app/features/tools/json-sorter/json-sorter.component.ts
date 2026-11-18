import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { WorkbenchStore } from '../../json-workbench/state/workbench.store';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';
import { sortJsonKeys } from '../../json-workbench/utils/json-sort.utils';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-json-sorter',
  imports: [TranslatePipe, JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro [title]="'tools.sorter.title' | t">
        <span slot="subtitle">{{ 'tools.sorter.subtitle' | t }}</span>
        <div slot="actions" class="tool-page__actions">
          <button
            type="button"
            class="tool-page__action-btn"
            (click)="onSort()"
            [disabled]="!canSort()"
            [attr.aria-label]="'tools.sorter.aria' | t"
          >
            {{ 'tools.sorter.button' | t }}
          </button>
          @if (lastStatus()) {
            <span class="tool-page__action-status" aria-live="polite">{{ lastStatus() }}</span>
          }
        </div>
      </app-tool-intro>
      <app-json-workbench />
    </div>
  `,
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonSorterComponent {
  protected readonly i18n = inject(I18nService);
  readonly store = inject(WorkbenchStore);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly lastStatus = signal('');
  readonly canSort = computed(() => this.store.leftMode() === 'text' && this.store.isValidJson());

  constructor() {
    this.title.setTitle('JSON Sorter — Sort Keys Alphabetically | JSON Hunt');
    this.meta.updateTag({
      name: 'description',
      content:
        'Sort all JSON object keys alphabetically in one click. Recursive key sorting across the entire JSON tree. Free online JSON sorter tool.',
    });
  }

  onSort(): void {
    if (!this.canSort()) return;

    const json = this.store.currentJson();
    if (json === null) return;

    const sorted = sortJsonKeys(json);
    const formatted = JSON.stringify(sorted, null, 2);
    this.store.setRawText(formatted);

    this.lastStatus.set(this.i18n.t('tools.sorter.done'));
  }
}
