import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToolCardComponent } from '../../components/ui/tool-card/tool-card.component';
import { ModuleState } from '../../components/ui/module-badge/module-badge.component';
import { RecentDocsService, RecentDoc } from '../../core/recent-docs.service';
import { WorkbenchStore } from '../json-workbench/state/workbench.store';

interface ToolDef {
  name: string;
  description: string;
  icon: string;
  route: string;
  state: ModuleState;
  ctaLabel: string;
}

const AVAILABLE_TOOLS: ToolDef[] = [
  {
    name: 'JSON Formatter',
    description: 'Beautify and format any JSON with proper indentation instantly.',
    icon: '✦',
    route: '/tools/json-formatter',
    state: 'most-used',
    ctaLabel: 'Open Formatter',
  },
  {
    name: 'JSON Validator',
    description: 'Validate JSON and get clear, actionable error messages.',
    icon: '✓',
    route: '/tools/json-validator',
    state: 'most-used',
    ctaLabel: 'Open Validator',
  },
  {
    name: 'JSON Error Finder',
    description: 'Find and fix JSON syntax errors with precise line/column references.',
    icon: '⚠️',
    route: '/tools/json-error-finder',
    state: 'new',
    ctaLabel: 'Open Error Finder',
  },
  {
    name: 'JSON Viewer',
    description: 'Explore JSON as an interactive tree or table.',
    icon: '⎇',
    route: '/tools/json-viewer',
    state: 'active',
    ctaLabel: 'Open Viewer',
  },
  {
    name: 'JSON Compare',
    description: 'Diff two JSON documents and highlight every change line by line.',
    icon: '⟷',
    route: '/tools/json-compare',
    state: 'new',
    ctaLabel: 'Open Compare',
  },
  {
    name: 'JSON Minifier',
    description: 'Remove whitespace and compress JSON to its smallest form.',
    icon: '⬡',
    route: '/tools/json-minifier',
    state: 'active',
    ctaLabel: 'Open Minifier',
  },
  {
    name: 'JSON to YAML',
    description: 'Convert JSON to clean, readable YAML in one click.',
    icon: '⇄',
    route: '/tools/json-to-yaml',
    state: 'active',
    ctaLabel: 'Convert to YAML',
  },
  {
    name: 'JSON to CSV',
    description: 'Export flat JSON arrays to CSV for spreadsheets and data pipelines.',
    icon: '⊞',
    route: '/tools/json-to-csv',
    state: 'active',
    ctaLabel: 'Convert to CSV',
  },
  {
    name: 'JSON to XML',
    description: 'Transform JSON structures into valid XML documents.',
    icon: '◈',
    route: '/tools/json-to-xml',
    state: 'active',
    ctaLabel: 'Convert to XML',
  },
  {
    name: 'JSON Cleaner',
    description: 'Remove nulls, empty strings and redundant fields from any JSON.',
    icon: '✧',
    route: '/tools/json-cleaner',
    state: 'new',
    ctaLabel: 'Clean JSON',
  },
  {
    name: 'JSON Sorter',
    description: 'Sort all keys alphabetically across the entire JSON tree.',
    icon: '⇅',
    route: '/tools/json-sorter',
    state: 'new',
    ctaLabel: 'Sort JSON',
  },
  {
    name: 'JSON Schema Validator',
    description: 'Validate any JSON against a JSON Schema draft-07 and get precise errors.',
    icon: '⬡',
    route: '/tools/json-schema-validator',
    state: 'new',
    ctaLabel: 'Validate Schema',
  },
  {
    name: 'JSONPath Tester',
    description: 'Test JSONPath expressions interactively and see matching results instantly.',
    icon: '⊙',
    route: '/tools/json-path-tester',
    state: 'new',
    ctaLabel: 'Test JSONPath',
  },
  {
    name: 'Schema Generator',
    description: 'Auto-generate a JSON Schema (draft-07) from any JSON document in one click.',
    icon: '◎',
    route: '/tools/json-schema-generator',
    state: 'new',
    ctaLabel: 'Generate Schema',
  },
];

const COMING_SOON_TOOLS: ToolDef[] = [];

@Component({
  selector: 'app-home',
  imports: [ToolCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly recentDocsService = inject(RecentDocsService);
  private readonly workbenchStore = inject(WorkbenchStore);

  readonly availableTools = AVAILABLE_TOOLS;
  readonly comingSoonTools = COMING_SOON_TOOLS;
  readonly recentDocs = this.recentDocsService.docs;

  goToWorkbench(): void {
    this.router.navigate(['/workbench']);
  }

  goToFormatter(): void {
    this.router.navigate(['/tools/json-formatter']);
  }

  openRecentDoc(doc: RecentDoc): void {
    this.workbenchStore.setRawText(doc.content);
    this.router.navigate(['/workbench']);
  }

  removeRecentDoc(doc: RecentDoc): void {
    this.recentDocsService.remove(doc.id);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  onNotify(toolName: string): void {
    // Future: open a modal or inline waitlist form
    console.info('Waitlist requested for:', toolName);
  }
}
