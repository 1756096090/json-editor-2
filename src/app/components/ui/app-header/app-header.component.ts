import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SettingsStore } from '../../../features/settings/settings.store';

interface NavTool {
  label: string;
  route: string;
  badge?: string;
}

const TOOLS_NAV: NavTool[] = [
  { label: 'JSON Formatter', route: '/tools/json-formatter', badge: 'most used' },
  { label: 'JSON Validator', route: '/tools/json-validator', badge: 'most used' },
  { label: 'JSON Viewer', route: '/tools/json-viewer' },
  { label: 'JSON Compare', route: '/tools/json-compare', badge: 'new' },
  { label: 'JSON Minifier', route: '/tools/json-minifier' },
  { label: 'JSON to YAML', route: '/tools/json-to-yaml' },
  { label: 'JSON to CSV', route: '/tools/json-to-csv' },
  { label: 'JSON to XML', route: '/tools/json-to-xml' },
  { label: 'JSON Cleaner', route: '/tools/json-cleaner', badge: 'new' },
  { label: 'JSON Sorter', route: '/tools/json-sorter', badge: 'new' },
];

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
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

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.header__tools-menu') && !target.closest('[data-tools-trigger]')) {
      this.closeTools();
    }
  }
}
