import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { WorkbenchStore } from '../../json-workbench/state/workbench.store';
import type { JsonValue } from '../../json-workbench/state/workbench.store';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';
import {
  cleanJson,
  countJsonEntries,
  DEFAULT_JSON_CLEAN_OPTIONS,
} from '../../json-workbench/utils/json-cleaner.utils';
import type { JsonCleanOptions } from '../../json-workbench/utils/json-cleaner.utils';

@Component({
  selector: 'app-json-cleaner',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON Cleaner">
        <span slot="subtitle">Remove null values, empty strings, empty arrays and empty objects
          from your JSON recursively. Configure what to remove, paste your JSON and click Clean.</span>
        <div slot="actions" class="tool-page__actions">
          <fieldset class="cleaner-options" aria-label="Select which empty values to remove">
            <legend class="cleaner-options__legend">Remove</legend>
            <label class="cleaner-option">
              <input
                type="checkbox"
                [checked]="opts().removeNull"
                (change)="toggleOpt('removeNull')"
                aria-label="Remove null values"
              />
              <span aria-hidden="true">null</span>
            </label>
            <label class="cleaner-option">
              <input
                type="checkbox"
                [checked]="opts().removeEmptyStrings"
                (change)="toggleOpt('removeEmptyStrings')"
                aria-label="Remove empty strings"
              />
              <span aria-hidden="true">""</span>
            </label>
            <label class="cleaner-option">
              <input
                type="checkbox"
                [checked]="opts().removeEmptyArrays"
                (change)="toggleOpt('removeEmptyArrays')"
                aria-label="Remove empty arrays"
              />
              <span aria-hidden="true">[ ]</span>
            </label>
            <label class="cleaner-option">
              <input
                type="checkbox"
                [checked]="opts().removeEmptyObjects"
                (change)="toggleOpt('removeEmptyObjects')"
                aria-label="Remove empty objects"
              />
              <span aria-hidden="true">&#123; &#125;</span>
            </label>
          </fieldset>
          <button
            type="button"
            class="tool-page__action-btn"
            (click)="onClean()"
            [disabled]="!store.isValidJson()"
            aria-label="Clean JSON — remove selected empty values"
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
  styleUrls: ['../tool-page.css', './json-cleaner.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonCleanerComponent {
  readonly store = inject(WorkbenchStore);

  readonly opts = signal<JsonCleanOptions>({ ...DEFAULT_JSON_CLEAN_OPTIONS });

  readonly lastStatus = signal('');

  constructor() {
    inject(Title).setTitle('JSON Cleaner — Remove Nulls & Empty Values | JSON Hunt');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Clean JSON by removing null values, empty strings, empty arrays and empty objects recursively. Free online JSON cleaning tool.',
    });
    this.restoreOptions();
  }

  private restoreOptions(): void {
    const saved = localStorage.getItem('json-we-format:cleaner-opts');
    if (saved) {
      try {
        this.opts.set(JSON.parse(saved));
      } catch {
        // Invalid JSON in localStorage, use defaults
      }
    }
  }

  toggleOpt(key: keyof JsonCleanOptions): void {
    this.opts.update((o) => {
      const updated = { ...o, [key]: !o[key] };
      localStorage.setItem('json-we-format:cleaner-opts', JSON.stringify(updated));
      return updated;
    });
  }

  onClean(): void {
    const json = this.store.currentJson();
    if (json === null) return;

    const opts = this.opts();
    const before = countJsonEntries(json);
    const fallback: JsonValue = Array.isArray(json) ? [] : {};
    const result = cleanJson(json, opts) ?? fallback;
    const after = countJsonEntries(result);
    const removed = before - after;

    this.store.setRawText(JSON.stringify(result, null, 2));
    this.lastStatus.set(
      removed > 0
        ? `Removed ${removed} empty ${removed === 1 ? 'value' : 'values'}.`
        : 'Nothing to clean.',
    );
  }
}
