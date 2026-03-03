import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { SettingsStore } from '../../features/settings/settings.store';

@Component({
  selector: 'app-settings-panel',
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()'
  }
})
export class SettingsPanelComponent {
  readonly settings = inject(SettingsStore);
  readonly closed = output<void>();

  close(): void {
    this.closed.emit();
  }

  reset(): void {
    this.settings.reset();
  }
}
