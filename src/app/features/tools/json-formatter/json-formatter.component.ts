import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-formatter',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  templateUrl: './json-formatter.component.html',
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonFormatterComponent {
  constructor() {
    inject(Title).setTitle('JSON Formatter — Beautify & Format JSON Online | JSON Hunt');
    inject(Meta).updateTag({ name: 'description', content: 'Paste your JSON and instantly format and beautify it with proper indentation. Free online JSON formatter.' });
  }
}
