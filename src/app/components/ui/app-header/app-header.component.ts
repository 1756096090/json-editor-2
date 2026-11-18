import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SettingsStore } from '../../../features/settings/settings.store';
import { LogoMarkComponent } from '../logo-mark/logo-mark.component';
import { IconComponent } from '../icon/icon.component';
import { SettingsPanelComponent } from '../../../shared/settings-panel/settings-panel.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../../core/i18n/en';

interface NavTool {
  labelKey: TranslationKey;
  route: string;
  badge?: 'new';
}

const TOOLS_NAV: NavTool[] = [
  { labelKey: 'tool.editor.name', route: '/workbench' },
  { labelKey: 'tool.pathTester.name', route: '/tools/json-path-tester', badge: 'new' },
  { labelKey: 'tool.schemaValidator.name', route: '/tools/json-schema-validator' },
];

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive,
    LogoMarkComponent,
    IconComponent,
    SettingsPanelComponent,
    TranslatePipe,
  ],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'role': 'banner',
    '(document:keydown.escape)': 'closeTools()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class AppHeaderComponent {
  private readonly settings = inject(SettingsStore);

  readonly tools = TOOLS_NAV;
  readonly toolsOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly isDark = computed(() => this.settings.themeMode() === 'dark');

  toggleTools(): void {
    this.toolsOpen.update((v) => !v);
  }

  closeTools(): void {
    this.toolsOpen.set(false);
  }

  toggleTheme(): void {
    this.settings.toggleThemeMode();
  }

  openSettings(): void {
    this.closeTools();
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.header__tools-menu') && !target.closest('[data-tools-trigger]')) {
      this.closeTools();
    }
  }
}
