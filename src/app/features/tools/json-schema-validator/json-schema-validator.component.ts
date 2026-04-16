import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { WorkbenchStore } from '../../json-workbench/state/workbench.store';
import { validateSchema, SchemaError } from './schema-validator';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-schema-validator',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON Schema Validator">
        <span slot="subtitle">Paste your JSON in the <strong>left panel</strong> and your JSON Schema
          in the <strong>right panel</strong>, then click Validate. Supports
          JSON Schema draft-07 (type, required, properties, enum, allOf/anyOf/oneOf,
          string/number/array constraints).</span>
        <div slot="actions" class="tool-intro-actions">
          <button
            type="button"
            class="tool-page__action-btn"
            (click)="onValidate()"
            [disabled]="!canValidate()"
            aria-label="Validate JSON against schema"
          >
            ⬡ Validate
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
          aria-label="Validation result"
        >
          @if (errors().length === 0) {
            <p class="schema-result__title">✓ Valid — JSON conforms to the schema.</p>
          } @else {
            <p class="schema-result__title">
              ✗ Invalid — {{ errors().length }} error{{ errors().length === 1 ? '' : 's' }} found.
            </p>
            <ul class="schema-result__errors" aria-label="Validation errors">
              @for (err of errors(); track $index) {
                <li class="schema-result__error">
                  <code class="schema-result__path">{{ err.path }}</code>
                  <span class="schema-result__msg">{{ err.message }}</span>
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
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonSchemaValidatorComponent {
  readonly store = inject(WorkbenchStore);

  readonly errors = signal<SchemaError[]>([]);
  readonly validated = signal(false);
  readonly lastStatus = signal('');

  readonly canValidate = computed(
    () => this.store.isValidJson() && this.store.baselineText().trim().length > 0
  );

  constructor() {
    inject(Title).setTitle('JSON Schema Validator — Validate JSON against JSON Schema | JSONScan');
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
      this.lastStatus.set('Left panel is not valid JSON.');
      return;
    }

    try {
      schema = JSON.parse(this.store.baselineText());
    } catch {
      this.lastStatus.set('Right panel (schema) is not valid JSON.');
      return;
    }

    const found = validateSchema(json, schema as Record<string, unknown>);
    this.errors.set(found);
    this.validated.set(true);
    this.lastStatus.set(found.length === 0 ? '✓ Valid' : `✗ ${found.length} error(s)`);
    this.store.setStatusMessage(
      found.length === 0 ? 'JSON is valid against the schema.' : `Schema validation failed — ${found.length} error(s).`
    );
  }
}
