import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-validator',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON Validator">
        <span slot="subtitle">Validate any JSON document and get clear, actionable error messages
          with exact line and column references.</span>
      </app-tool-intro>
      <app-json-workbench />
    </div>
  `,
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonValidatorComponent {
  constructor() {
    inject(Title).setTitle('JSON Validator — Validate JSON with Precise Errors | JSONScan');
    inject(Meta).updateTag({ name: 'description', content: 'Validate any JSON document online. Get clear error messages with exact line and column references. Free JSON validator.' });
  }
}
