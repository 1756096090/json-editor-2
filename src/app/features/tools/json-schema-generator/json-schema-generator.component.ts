import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { WorkbenchStore } from '../../json-workbench/state/workbench.store';
import { generateSchema } from './schema-generator';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-schema-generator',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="Auto Schema Generator">
        <span slot="subtitle">Paste any JSON in the left panel and click Generate — a JSON Schema
          (draft-07) that reflects your data structure will appear in the
          right panel. All properties are inferred as required and typed accurately.</span>
        <div slot="actions" class="tool-intro-actions">
          <button
            type="button"
            class="tool-page__action-btn"
            (click)="onGenerate()"
            [disabled]="!store.isValidJson()"
            aria-label="Generate JSON Schema from the current JSON"
          >
            ⬡ Generate Schema
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
export class JsonSchemaGeneratorComponent {
  readonly store = inject(WorkbenchStore);
  readonly lastStatus = signal('');

  constructor() {
    inject(Title).setTitle('JSON Schema Generator — Auto Generate Schema from JSON | JSONScan');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Automatically generate a JSON Schema (draft-07) from any JSON document. Infers types, required fields, and nested structures instantly. Free online tool.',
    });
  }

  onGenerate(): void {
    if (!this.store.isValidJson()) return;

    try {
      const json = JSON.parse(this.store.rawText());
      const schema = generateSchema(json);
      const text = JSON.stringify(schema, null, 2);
      this.store.setBaselineText(text);
      this.lastStatus.set('Schema generated in right panel.');
      this.store.setStatusMessage('JSON Schema generated from current JSON.');
    } catch {
      this.lastStatus.set('Failed to generate schema.');
    }
  }
}
