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
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-json-cleaner',
  imports: [TranslatePipe, JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro [title]="'tools.cleaner.title' | t">
        <span slot="subtitle">{{ 'tools.cleaner.subtitle' | t }}</span>
        <div slot="actions" class="tool-page__actions">
          <fieldset class="cleaner-options" [attr.aria-label]="'tools.cleaner.optionsAria' | t">
            <legend class="cleaner-options__legend">{{ 'tools.cleaner.remove' | t }}</legend>
            <label class="cleaner-option">
              <input
                type="checkbox"
                [checked]="opts().removeNull"
                (change)="toggleOpt('removeNull')"
                [attr.aria-label]="'tools.cleaner.removeNull' | t"
              />
              <span aria-hidden="true">null</span>
            </label>
            <label class="cleaner-option">
              <input
                type="checkbox"
                [checked]="opts().removeEmptyStrings"
                (change)="toggleOpt('removeEmptyStrings')"
                [attr.aria-label]="'tools.cleaner.removeEmptyStrings' | t"
              />
              <span aria-hidden="true">""</span>
            </label>
            <label class="cleaner-option">
              <input
                type="checkbox"
                [checked]="opts().removeEmptyArrays"
                (change)="toggleOpt('removeEmptyArrays')"
                [attr.aria-label]="'tools.cleaner.removeEmptyArrays' | t"
              />
              <span aria-hidden="true">[ ]</span>
            </label>
            <label class="cleaner-option">
              <input
                type="checkbox"
                [checked]="opts().removeEmptyObjects"
                (change)="toggleOpt('removeEmptyObjects')"
                [attr.aria-label]="'tools.cleaner.removeEmptyObjects' | t"
              />
              <span aria-hidden="true">&#123; &#125;</span>
            </label>
          </fieldset>
          <button
            type="button"
            class="tool-page__action-btn"
            (click)="onClean()"
            [disabled]="!store.isValidJson()"
            [attr.aria-label]="'tools.cleaner.aria' | t"
          >
            {{ 'tools.cleaner.button' | t }}
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
  protected readonly i18n = inject(I18nService);
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
        ? this.i18n.t(removed === 1 ? 'tools.cleaner.removedOne' : 'tools.cleaner.removedMany', { n: removed })
        : this.i18n.t('tools.cleaner.nothing'),
    );
  }
}
