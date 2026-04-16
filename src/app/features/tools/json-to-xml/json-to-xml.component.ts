import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-to-xml',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON to XML">
        <span slot="subtitle">Transform any JSON structure into valid XML.
          Useful for legacy integrations, SOAP services and data exchange formats.</span>
      </app-tool-intro>
      <app-json-workbench />
    </div>
  `,
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonToXmlComponent {
  constructor() {
    inject(Title).setTitle('JSON to XML Converter — Transform JSON to XML Online | JSONScan');
    inject(Meta).updateTag({ name: 'description', content: 'Transform JSON structures into valid XML documents. Free online JSON to XML converter for legacy integrations, SOAP and data exchange.' });
  }
}
