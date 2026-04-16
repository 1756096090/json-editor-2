import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-compare',
  imports: [JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON Compare">
        <span slot="subtitle">
          Paste the <strong>original</strong> JSON in the left panel and the
          <strong>modified</strong> JSON in the right panel. Press
          <kbd>⇄</kbd> (or <kbd>Ctrl+Shift+D</kbd>) to enable diff — every
          addition, deletion and change is highlighted line&#8209;by&#8209;line.
          Use <kbd>Alt+↑</kbd>&#8202;/&#8202;<kbd>Alt+↓</kbd> to jump between hunks.
          <ul class="tool-page__legend" aria-label="Diff legend">
            <li><span class="legend-dot legend-dot--added"></span> Added</li>
            <li><span class="legend-dot legend-dot--removed"></span> Removed</li>
            <li><span class="legend-dot legend-dot--changed"></span> Changed</li>
          </ul>
        </span>
      </app-tool-intro>
      <app-json-workbench />
    </div>
  `,
  styles: [`
    .tool-page__legend {
      display: flex;
      gap: 16px;
      list-style: none;
      padding: 0;
      margin: 10px 0 0;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .tool-page__legend li {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .legend-dot--added   { background: var(--color-success); }
    .legend-dot--removed { background: var(--color-error); }
    .legend-dot--changed { background: var(--color-accent); }

    kbd {
      display: inline-block;
      padding: 1px 5px;
      font-family: var(--font-mono, monospace);
      font-size: 0.75rem;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      border-radius: 3px;
    }
  `],
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonCompareComponent {
  constructor() {
    inject(Title).setTitle('JSON Compare — Diff Two JSON Documents Side by Side | JSONScan');
    inject(Meta).updateTag({ name: 'description', content: 'Compare two JSON documents side by side. Highlights every added, removed and changed line. Free online JSON diff and compare tool.' });
  }
}

