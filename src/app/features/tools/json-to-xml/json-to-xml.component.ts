import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-json-to-xml',
  imports: [TranslatePipe, JsonWorkbenchComponent, ToolIntroComponent],
  templateUrl: './json-to-xml.component.html',
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonToXmlComponent {
  constructor() {
    inject(Title).setTitle('JSON to XML Converter — Transform JSON to XML Online | JSON Hunt');
    inject(Meta).updateTag({ name: 'description', content: 'Transform JSON structures into valid XML documents. Free online JSON to XML converter for legacy integrations, SOAP and data exchange.' });
  }
}
