import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Module state badge — communicates the availability state of a tool or feature.
 *
 * Rules (from README):
 *  - `most-used`: max 3 per grid
 *  - `recommended`: max 1 per screen
 *  - `coming-soon`: max 4 per screen
 *  - `draft`: NEVER visible to users
 */
export type ModuleState =
  | 'active'
  | 'most-used'
  | 'recommended'
  | 'new'
  | 'coming-soon'
  | 'premium'
  | 'experimental'
  | 'locked';

const STATE_LABELS: Record<ModuleState, string> = {
  active: '',
  'most-used': 'most used',
  recommended: 'recommended',
  new: 'new',
  'coming-soon': 'coming soon',
  premium: 'pro',
  experimental: 'beta',
  locked: 'locked',
};

@Component({
  selector: 'app-module-badge',
  template: `
    @if (label()) {
      <span class="module-badge" [class]="badgeClass()" [attr.aria-label]="label()">
        {{ label() }}
      </span>
    }
  `,
  styleUrl: './module-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleBadgeComponent {
  readonly state = input.required<ModuleState>();

  readonly label = computed(() => STATE_LABELS[this.state()]);
  readonly badgeClass = computed(() => `module-badge--${this.state()}`);
}
