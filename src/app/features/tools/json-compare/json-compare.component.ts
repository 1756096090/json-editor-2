import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-compare',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  templateUrl: './json-compare.component.html',
  styleUrls: ['./json-compare.component.css', '../tool-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonCompareComponent {
  constructor() {
    inject(Title).setTitle('JSON Compare — Diff Two JSON Documents Side by Side | JSONScan');
    inject(Meta).updateTag({ name: 'description', content: 'Compare two JSON documents side by side. Highlights every added, removed and changed line. Free online JSON diff and compare tool.' });
  }
}

