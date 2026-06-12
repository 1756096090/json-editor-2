import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-viewer',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  templateUrl: './json-viewer.component.html',
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonViewerComponent {
  constructor() {
    inject(Title).setTitle('JSON Viewer — Explore JSON as Tree or Table | JSON Hunt');
    inject(Meta).updateTag({ name: 'description', content: 'View and explore JSON as an interactive tree or table. Expand, collapse and navigate complex nested structures. Free online JSON viewer.' });
  }
}
