import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-to-csv',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON to CSV">
        <span slot="subtitle">Export flat JSON arrays to CSV format for spreadsheets,
          data pipelines and analytics tools.</span>
      </app-tool-intro>
      <app-json-workbench />
    </div>
  `,
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonToCsvComponent {
  constructor() {
    inject(Title).setTitle('JSON to CSV Converter — Export JSON Arrays Online | JSONScan');
    inject(Meta).updateTag({ name: 'description', content: 'Convert flat JSON arrays to CSV for spreadsheets, data pipelines and analytics. Free online JSON to CSV converter tool.' });
  }
}
