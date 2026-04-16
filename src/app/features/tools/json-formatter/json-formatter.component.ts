import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-formatter',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON Formatter">
        <span slot="subtitle">Paste your JSON below and format it with proper indentation instantly.
          Supports any valid JSON — objects, arrays, nested structures.</span>
      </app-tool-intro>
      <app-json-workbench />
    </div>
  `,
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonFormatterComponent {
  constructor() {
    inject(Title).setTitle('JSON Formatter — Beautify & Format JSON Online | JSONScan');
    inject(Meta).updateTag({ name: 'description', content: 'Paste your JSON and instantly format and beautify it with proper indentation. Free online JSON formatter.' });
  }
}
