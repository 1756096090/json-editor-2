import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { WorkbenchStore, JsonValue } from '../../json-workbench/state/workbench.store';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

function sortJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, JsonValue>>((acc, key) => {
        acc[key] = sortJson(value[key]);
        return acc;
      }, {});
  }

  return value;
}

@Component({
  selector: 'app-json-sorter',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON Sorter">
        <span slot="subtitle">Sort all object keys alphabetically across the entire JSON tree.
          Nested objects are sorted recursively. Paste your JSON on the left panel, then click Sort.</span>
        <div slot="actions" class="tool-intro-actions">
          <button
            type="button"
            class="tool-page__action-btn"
            (click)="onSort()"
            [disabled]="!store.isValidJson()"
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

  constructor() {
    this.title.setTitle('JSON Sorter — Sort Keys Alphabetically | JSONScan');
    this.meta.updateTag({
      name: 'description',
      content:
        'Sort all JSON object keys alphabetically in one click. Recursive key sorting across the entire JSON tree. Free online JSON sorter tool.',
    });
  }

  onSort(): void {
    const json = this.store.currentJson();
    if (json === null) return;

    const sorted = sortJson(json);
    const formatted = JSON.stringify(sorted, null, 2);
    this.store.setRawText(formatted);

    this.lastStatus.set('Keys sorted alphabetically.');
  }
}
