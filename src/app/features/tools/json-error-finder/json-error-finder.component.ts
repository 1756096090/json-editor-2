import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { JsonWorkbenchComponent } from '../../json-workbench/json-workbench.component';
import { ToolIntroComponent } from '../tool-intro/tool-intro.component';
import { WorkbenchStore } from '../../json-workbench/state/workbench.store';
import { findJsonErrors } from './error-finder.utils';

@Component({
  selector: 'app-json-error-finder',
  imports: [CommonModule, JsonWorkbenchComponent, ToolIntroComponent],
  template: `
    <div class="tool-page">
      <app-tool-intro title="JSON Error Finder">
        <span slot="subtitle">Identify and locate JSON syntax errors with precise line and column references. 
          Get actionable suggestions to fix each issue.</span>
      </app-tool-intro>

      <!-- Error Analysis Panel -->
      <div class="error-finder-panel" *ngIf="errorResults() as results">
        <div class="error-finder-header">
          <h3>
            @if (results.isValid) {
              ✓ Valid JSON
            } @else {
              ⚠️ Errors Found
            }
          </h3>
          <p class="error-finder-summary">{{ results.summary }}</p>
        </div>

        @if (!results.isValid && results.errors.length > 0) {
          <div class="error-finder-list">
            @for (error of results.errors; track $index) {
              <div class="error-item" [class.error-item--warning]="error.severity === 'warning'">
                <div class="error-item__header">
                  <span class="error-item__type">{{ error.errorType }}</span>
                  <span class="error-item__location">Ln {{ error.line }}, Col {{ error.column }}</span>
                </div>
                <p class="error-item__message">{{ error.message }}</p>
                <code class="error-item__context">{{ error.context }}</code>
                <p class="error-item__suggestion">💡 {{ error.suggestion }}</p>
              </div>
            }
          </div>
        }
      </div>

      <app-json-workbench />
    </div>
  `,
  styles: `
    .error-finder-panel {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-4);
      overflow: hidden;
    }

    .error-finder-header {
      background: linear-gradient(to right, var(--color-surface) 0%, var(--color-surface-alt) 100%);
      padding: var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }

    .error-finder-header h3 {
      margin: 0 0 var(--space-1) 0;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .error-finder-summary {
      margin: 0;
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }

    .error-finder-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .error-item {
      padding: var(--space-3);
      border-bottom: 1px solid var(--color-border);
      border-left: 3px solid var(--color-danger);
    }

    .error-item--warning {
      border-left-color: var(--color-warning);
      background: rgba(255, 193, 7, 0.02);
    }

    .error-item__header {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-1-5);
      align-items: center;
    }

    .error-item__type {
      display: inline-block;
      background: var(--color-danger);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      font-family: monospace;
    }

    .error-item--warning .error-item__type {
      background: var(--color-warning);
      color: #333;
    }

    .error-item__location {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      font-family: monospace;
    }

    .error-item__message {
      margin: 0 0 var(--space-1-5) 0;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-text);
    }

    .error-item__context {
      display: block;
      background: var(--color-background);
      padding: var(--space-2);
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      margin-bottom: var(--space-1-5);
      overflow-x: auto;
      word-break: break-all;
    }

    .error-item__suggestion {
      margin: 0;
      padding: var(--space-2);
      background: rgba(76, 175, 80, 0.05);
      border-left: 2px solid var(--color-success);
      border-radius: var(--radius-sm);
      font-size: var(--text-sm);
      color: var(--color-text);
      font-style: italic;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonErrorFinderComponent {
  private readonly store = inject(WorkbenchStore);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  readonly errorResults = computed(() => {
    const rawText = this.store.rawText();
    return findJsonErrors(rawText);
  });

  constructor() {
    this.titleService.setTitle('JSON Error Finder — Find & Fix JSON Errors | JSONScan');
    this.metaService.updateTag({
      name: 'description',
      content: 'Find and fix JSON syntax errors accurately. Get precise line and column references with actionable suggestions.'
    });
  }
}
