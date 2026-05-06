import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-minifier',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  templateUrl: './json-minifier.component.html',
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonMinifierComponent {
  constructor() {
    inject(Title).setTitle('JSON Minifier — Compress & Minify JSON Online | JSONScan');
    inject(Meta).updateTag({ name: 'description', content: 'Remove all whitespace and compress JSON to its smallest form. Ideal for API payloads and config files. Free online JSON minifier.' });
  }
}
