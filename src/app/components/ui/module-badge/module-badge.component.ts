import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../../core/i18n/en';

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

/** Translation key per state; `active` shows no badge. */
const STATE_LABELS: Record<ModuleState, TranslationKey | null> = {
  active: null,
  'most-used': 'badge.mostUsed',
  recommended: 'badge.recommended',
  new: 'badge.new',
  'coming-soon': 'badge.comingSoon',
  premium: 'badge.premium',
  experimental: 'badge.experimental',
  locked: 'badge.locked',
};

@Component({
  selector: 'app-module-badge',
  imports: [TranslatePipe],
  templateUrl: './module-badge.component.html',
  styleUrl: './module-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleBadgeComponent {
  readonly state = input.required<ModuleState>();

  readonly labelKey = computed(() => STATE_LABELS[this.state()]);
  readonly badgeClass = computed(() => `module-badge--${this.state()}`);
}
