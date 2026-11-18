import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToolCardComponent } from '../../components/ui/tool-card/tool-card.component';
import { ModuleState } from '../../components/ui/module-badge/module-badge.component';
import { RecentDocsService, RecentDoc } from '../../core/recent-docs.service';
import { WorkbenchStore } from '../json-workbench/state/workbench.store';
import { AdSlotComponent } from '../../components/ui/ad-slot/ad-slot.component';
import { IconComponent, IconName } from '../../components/ui/icon/icon.component';
import { LogoMarkComponent } from '../../components/ui/logo-mark/logo-mark.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../core/i18n/en';

interface ToolDef {
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: IconName;
  route: string;
  state: ModuleState;
  ctaKey: TranslationKey;
}

const AVAILABLE_TOOLS: ToolDef[] = [
  {
    nameKey: 'tool.editor.name',
    descriptionKey: 'tool.editor.desc',
    icon: 'code',
    route: '/workbench',
    state: 'most-used',
    ctaKey: 'tool.editor.cta',
  },
  {
    nameKey: 'tool.pathTester.name',
    descriptionKey: 'tool.pathTester.desc',
    icon: 'path',
    route: '/tools/json-path-tester',
    state: 'new',
    ctaKey: 'tool.pathTester.cta',
  },
  {
    nameKey: 'tool.schemaValidator.name',
    descriptionKey: 'tool.schemaValidator.desc',
    icon: 'shield-check',
    route: '/tools/json-schema-validator',
    state: 'active',
    ctaKey: 'tool.schemaValidator.cta',
  },
];

const COMING_SOON_TOOLS: ToolDef[] = [
  {
    nameKey: 'tool.translator.name',
    descriptionKey: 'tool.translator.desc',
    icon: 'translate',
    route: '',
    state: 'coming-soon',
    ctaKey: 'tool.translator.cta',
  },
];

@Component({
  selector: 'app-home',
  imports: [
    ToolCardComponent,
    IconComponent,
    RouterLink,
    AdSlotComponent,
    LogoMarkComponent,
    TranslatePipe,
  ],
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
  readonly currentYear = new Date().getFullYear();

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
}
