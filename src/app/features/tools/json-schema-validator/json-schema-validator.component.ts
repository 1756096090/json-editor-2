import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { WorkbenchStore } from '../../json-workbench/state/workbench.store';
import { validateSchema, SchemaError } from './schema-validator';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-json-schema-validator',
  imports: [TranslatePipe, JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro [title]="'tool.schemaValidator.name' | t">
        <span slot="subtitle">{{ 'tools.schemaVal.s1' | t }} <strong>{{ 'tools.schemaVal.left' | t }}</strong>
          {{ 'tools.schemaVal.s2' | t }} <strong>{{ 'tools.schemaVal.right' | t }}</strong>{{ 'tools.schemaVal.s3' | t }}</span>
        <div slot="actions" class="tool-page__actions">
          <button
            type="button"
            class="tool-page__action-btn"
            (click)="onValidate()"
            [disabled]="!canValidate()"
            [attr.aria-label]="'tools.schemaVal.aria' | t"
          >
            {{ 'tools.schemaVal.button' | t }}
          </button>
          @if (lastStatus()) {
            <span class="tool-page__action-status" aria-live="polite">{{ lastStatus() }}</span>
          }
        </div>
      </app-tool-intro>

      @if (validated()) {
        <div
          class="schema-result"
          [class.schema-result--valid]="errors().length === 0"
          [class.schema-result--invalid]="errors().length > 0"
          role="region"
          [attr.aria-label]="'tools.schemaVal.resultAria' | t"
        >
          @if (errors().length === 0) {
            <p class="schema-result__title">{{ 'tools.schemaVal.valid' | t }}</p>
          } @else {
            <p class="schema-result__title">
              {{ (errors().length === 1 ? 'tools.schemaVal.invalidOne' : 'tools.schemaVal.invalidMany') | t: { n: errors().length } }}
            </p>
            <ul class="schema-result__errors" [attr.aria-label]="'tools.schemaVal.errorsAria' | t">
              @for (err of errors(); track $index) {
                <li class="schema-result__error">
                  <code class="schema-result__path">{{ err.path }}</code>
                  <span class="schema-result__msg">{{ err.messageKey | t: err.params }}</span>
                </li>
              }
            </ul>
          }
        </div>
      }

      <app-json-workbench />
    </div>
  `,
  styles: [`
    .schema-result {
      margin: 0 0 0;
      padding: 12px 20px;
      border-left: 3px solid transparent;
      background: var(--color-surface-raised);
      font-size: 0.875rem;
    }
    .schema-result--valid  { border-left-color: var(--color-success); }
    .schema-result--invalid { border-left-color: var(--color-error); }

    .schema-result__title {
      margin: 0 0 8px;
      font-weight: 600;
    }
    .schema-result--valid .schema-result__title  { color: var(--color-success); }
    .schema-result--invalid .schema-result__title { color: var(--color-error); }

    .schema-result__errors {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .schema-result__error {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .schema-result__path {
      flex-shrink: 0;
      font-size: 0.75rem;
      color: var(--color-accent);
      background: var(--color-surface);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .schema-result__msg { color: var(--color-text-muted); }
  `],
  styleUrls: ['../tool-page.css', './json-schema-validator.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonSchemaValidatorComponent {
  protected readonly i18n = inject(I18nService);
  readonly store = inject(WorkbenchStore);

  readonly errors = signal<SchemaError[]>([]);
  readonly validated = signal(false);
  readonly lastStatus = signal('');

  readonly canValidate = computed(
    () => this.store.isValidJson() && this.store.baselineText().trim().length > 0
  );

  constructor() {
    inject(Title).setTitle('JSON Schema Validator — Validate JSON against JSON Schema | JSON Hunt');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Validate any JSON document against a JSON Schema (draft-07). Paste JSON on the left and schema on the right. Free online JSON Schema validator.',
    });
  }

  onValidate(): void {
    if (!this.canValidate()) return;

    let json: unknown;
    let schema: unknown;

    try {
      json = JSON.parse(this.store.rawText());
    } catch {
      this.lastStatus.set(this.i18n.t('tools.schemaVal.leftInvalid'));
      return;
    }

    try {
      schema = JSON.parse(this.store.baselineText());
    } catch {
      this.lastStatus.set(this.i18n.t('tools.schemaVal.rightInvalid'));
      return;
    }

    const found = validateSchema(json, schema as Record<string, unknown>);
    this.errors.set(found);
    this.validated.set(true);
    const n = found.length;
    this.lastStatus.set(this.i18n.t(n === 0 ? 'tools.schemaVal.statusValid' : 'tools.schemaVal.statusErrors', { n }));
    this.store.setStatusMessage(
      this.i18n.t(n === 0 ? 'tools.schemaVal.toastValid' : 'tools.schemaVal.toastInvalid', { n })
    );
  }
}
