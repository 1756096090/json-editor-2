import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { WorkbenchStore } from '../../json-workbench/state/workbench.store';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';
import { sortJsonKeys } from '../../json-workbench/utils/json-sort.utils';

@Component({
  selector: 'app-json-sorter',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON Sorter">
        <span slot="subtitle">Sort all object keys alphabetically across the entire JSON tree.
          Nested objects are sorted recursively. Paste your JSON on the left panel, then click Sort.</span>
        <div slot="actions" class="tool-page__actions">
          <button
            type="button"
            class="tool-page__action-btn"
            (click)="onSort()"
            [disabled]="!canSort()"
            aria-label="Sort JSON keys alphabetically"
          >
            ⇅ Sort Keys
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

    this.lastStatus.set('Keys sorted alphabetically.');
  }
}
