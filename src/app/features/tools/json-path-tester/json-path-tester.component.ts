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
  templateUrl: './json-path-tester.component.html',
  styleUrls: ['./json-path-tester.component.css', '../tool-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonPathTesterComponent {
  readonly store = inject(WorkbenchStore);

  readonly expression = signal('$');
  readonly results = signal<PathResult[]>([]);
  readonly statusMsg = signal('');

  readonly canRun = computed(() => this.store.isValidJson() && this.expression().trim() !== '');

  constructor() {
    inject(Title).setTitle('JSONPath Tester — Query JSON Interactively | JSON Hunt');
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
