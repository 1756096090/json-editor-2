import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ThemeMode } from '../../state/workbench.store';
import { ButtonComponent } from '../../../../components/ui/button/button.component';
import { StatusBadgeComponent } from '../../../../components/ui/status-badge/status-badge.component';
import { ErrorBannerComponent } from '../../../../components/ui/error-banner/error-banner.component';
import { ShortcutHintComponent } from '../../../../components/ui/shortcut-hint/shortcut-hint.component';

@Component({
  selector: 'app-toolbar',
  imports: [ButtonComponent, StatusBadgeComponent, ErrorBannerComponent, ShortcutHintComponent],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onWindowKeydown($event)'
  }
})
export class ToolbarComponent {
  readonly valid = input<boolean>(true);
  readonly errorMessage = input<string>('');
  readonly themeMode = input<ThemeMode>('light');
  readonly diffOpen = input<boolean>(false);

  readonly formatPressed = output<void>();
  readonly minifyPressed = output<void>();
  readonly copyPressed = output<void>();
  readonly pastePressed = output<void>();
  readonly downloadPrettyPressed = output<void>();
  readonly downloadMinPressed = output<void>();
  readonly openFilePressed = output<void>();
  readonly toggleThemePressed = output<void>();
  readonly toggleDiffPressed = output<void>();

  onWindowKeydown(event: KeyboardEvent): void {
    const hasCommand = event.ctrlKey || event.metaKey;
    if (!hasCommand) {
      return;
    }

    const key = event.key.toLowerCase();

    if (event.shiftKey && key === 'f') {
      event.preventDefault();
      this.formatPressed.emit(undefined);
      return;
    }

    if (!event.shiftKey && key === 'm') {
      event.preventDefault();
      this.minifyPressed.emit(undefined);
      return;
    }

    if (!event.shiftKey && key === 's') {
      event.preventDefault();
      this.downloadPrettyPressed.emit(undefined);
    }
  }
}
