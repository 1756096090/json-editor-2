import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'neutral';

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  readonly variant = input<BadgeVariant>('neutral');
  readonly label = input.required<string>();
}
