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
  templateUrl: './json-error-finder.component.html',
  styleUrl: './json-error-finder.component.css',
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
    this.titleService.setTitle('JSON Error Finder — Find & Fix JSON Errors | JSON Hunt');
    this.metaService.updateTag({
      name: 'description',
      content: 'Find and fix JSON syntax errors accurately. Get precise line and column references with actionable suggestions.'
    });
  }
}
