import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { WorkbenchStore } from '../../json-workbench/state/workbench.store';
import { evaluateJsonPath, PathResult } from './json-path';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';

@Component({
  selector: 'app-json-path-tester',
  imports: [JsonWorkbenchComponent, FormsModule, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSONPath Tester">
        <span slot="subtitle">Paste your JSON in the left panel and type a JSONPath expression below
          to interactively query matching values. Supports
          <code>$</code>, <code>.key</code>, <code>..key</code>,
          <code>[n]</code>, <code>[*]</code>, <code>[n:m]</code>,
          <code>[n,m]</code>, and bracket notation.</span>
      </app-tool-intro>

      <div class="jp-bar" role="search" aria-label="JSONPath query">
        <label class="jp-bar__label" for="jp-input">Expression</label>
        <input
          id="jp-input"
          class="jp-bar__input"
          type="text"
          placeholder="$.store.book[*].author"
          [value]="expression()"
          (input)="expression.set($any($event.target).value)"
          (keydown.enter)="onEvaluate()"
          autocomplete="off"
          spellcheck="false"
          aria-describedby="jp-hint"
        />
        <button
          type="button"
          class="tool-page__action-btn"
          (click)="onEvaluate()"
          [disabled]="!store.isValidJson() || !expression().trim()"
          aria-label="Run JSONPath expression"
        >
          ⊙ Run
        </button>
      </div>
      <p id="jp-hint" class="jp-hint" aria-live="polite">
        @if (statusMsg()) { {{ statusMsg() }} }
      </p>

      @if (results().length > 0) {
        <div class="jp-results" role="region" aria-label="Query results">
          <p class="jp-results__count">{{ results().length }} match{{ results().length === 1 ? '' : 'es' }}</p>
          <ul class="jp-results__list">
            @for (result of results(); track $index) {
              <li class="jp-results__item">
                <code class="jp-results__path">{{ result.path }}</code>
                <pre class="jp-results__value">{{ stringify(result.value) }}</pre>
              </li>
            }
          </ul>
        </div>
      }

      <app-json-workbench />
    </div>
  `,
  styles: [`
    .jp-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--color-surface-raised);
      border-bottom: 1px solid var(--color-border);
    }
    .jp-bar__label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      white-space: nowrap;
    }
    .jp-bar__input {
      flex: 1;
      padding: 6px 10px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      color: var(--color-text);
      font-family: var(--font-mono, monospace);
      font-size: 0.875rem;
    }
    .jp-bar__input:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: 1px;
    }

    .jp-hint {
      min-height: 1.5rem;
      padding: 4px 16px;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin: 0;
    }

    .jp-results {
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border);
    }
    .jp-results__count {
      margin: 0 0 8px;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .jp-results__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 240px;
      overflow-y: auto;
    }
    .jp-results__item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--color-surface-raised);
      border-radius: 4px;
      padding: 8px 12px;
    }
    .jp-results__path {
      flex-shrink: 0;
      font-size: 0.75rem;
      color: var(--color-accent);
      background: var(--color-surface);
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .jp-results__value {
      flex: 1;
      margin: 0;
      font-family: var(--font-mono, monospace);
      font-size: 0.8125rem;
      color: var(--color-text);
      white-space: pre-wrap;
      word-break: break-all;
    }
  `],
  styleUrl: '../tool-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonPathTesterComponent {
  readonly store = inject(WorkbenchStore);

  readonly expression = signal('$');
  readonly results = signal<PathResult[]>([]);
  readonly statusMsg = signal('');

  readonly canRun = computed(() => this.store.isValidJson() && this.expression().trim() !== '');

  constructor() {
    inject(Title).setTitle('JSONPath Tester — Query JSON Interactively | JSONScan');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Test JSONPath expressions interactively. Paste JSON and write a JSONPath query to see matching values instantly. Free online JSONPath evaluator.',
    });
  }

  onEvaluate(): void {
    if (!this.canRun()) return;

    let json: unknown;
    try {
      json = JSON.parse(this.store.rawText());
    } catch {
      this.statusMsg.set('Invalid JSON in the left panel.');
      return;
    }

    try {
      const found = evaluateJsonPath(json, this.expression().trim());
      this.results.set(found);
      this.statusMsg.set(found.length === 0 ? 'No matches found.' : '');
      this.store.setStatusMessage(
        found.length === 0
          ? 'JSONPath: no matches.'
          : `JSONPath: ${found.length} match${found.length === 1 ? '' : 'es'} found.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Evaluation error.';
      this.statusMsg.set(msg);
      this.results.set([]);
    }
  }

  stringify(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }
}
