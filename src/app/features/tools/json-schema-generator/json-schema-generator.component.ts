import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { WorkbenchStore } from '../../json-workbench/state/workbench.store';
import { generateSchema } from './schema-generator';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';
import { IconComponent } from '../../../components/ui/icon/icon.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-json-schema-generator',
  imports: [TranslatePipe, JsonWorkbenchComponent, ToolIntroComponent, IconComponent],
  templateUrl: './json-schema-generator.component.html',
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonSchemaGeneratorComponent {
  protected readonly i18n = inject(I18nService);
  readonly store = inject(WorkbenchStore);
  readonly lastStatus = signal('');

  constructor() {
    inject(Title).setTitle('JSON Schema Generator — Auto Generate Schema from JSON | JSON Hunt');
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
      this.lastStatus.set(this.i18n.t('tools.schemaGen.done'));
      this.store.setStatusMessage(this.i18n.t('tools.schemaGen.doneStatus'));
    } catch {
      this.lastStatus.set(this.i18n.t('tools.schemaGen.failed'));
    }
  }
}
