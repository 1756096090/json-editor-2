import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { WorkbenchStore, JsonValue } from '../../json-workbench/state/workbench.store';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

function cleanJson(value: JsonValue): JsonValue | undefined {
  if (value === null || value === '') return undefined;

  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => cleanJson(item))
      .filter((item): item is JsonValue => item !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }

  if (typeof value === 'object') {
    const cleaned: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(value)) {
      const result = cleanJson(v);
      if (result !== undefined) {
        cleaned[k] = result;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  return value;
}

@Component({
  selector: 'app-json-cleaner',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON Cleaner">
        <span slot="subtitle">Remove null values, empty strings, empty arrays and empty objects
          from your JSON recursively. Paste your JSON on the left panel, then click Clean.</span>
        <div slot="actions" class="tool-intro-actions">
          <button
            type="button"
            class="tool-page__action-btn"
            (click)="onClean()"
            [disabled]="!store.isValidJson()"
            aria-label="Clean JSON — remove nulls and empty values"
          >
            ✧ Clean JSON
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
export class JsonCleanerComponent {
  readonly store = inject(WorkbenchStore);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly lastStatus = signal('');

  constructor() {
    this.title.setTitle('JSON Cleaner — Remove Nulls & Empty Values | JSONScan');
    this.meta.updateTag({
      name: 'description',
      content:
        'Clean JSON by removing null values, empty strings, empty arrays and empty objects recursively. Free online JSON cleaning tool.',
    });
  }

  onClean(): void {
    const json = this.store.currentJson();
    if (json === null) return;

    const result = cleanJson(json) ?? {};
    const formatted = JSON.stringify(result, null, 2);
    this.store.setRawText(formatted);

    const before = JSON.stringify(json).length;
    const after = formatted.length;
    const saved = Math.max(0, before - after);
    this.lastStatus.set(saved > 0 ? `Removed ${saved} chars of empty values.` : 'Nothing to clean.');
  }
}
