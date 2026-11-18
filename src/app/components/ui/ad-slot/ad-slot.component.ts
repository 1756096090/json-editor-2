import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export type AdSlotPlacement = 'sidebar' | 'banner';

/**
 * Master switch for every reserved ad space. While no ad network is
 * integrated, set to `false` to hide the placeholders without touching layouts.
 */
export const AD_SLOTS_ENABLED = true;

/**
 * Reserved, fixed-size advertising space. It never loads ad scripts: an ad
 * network can later render into `.ad-slot__frame` (see `data-ad-placement`).
 * The frame's size is fixed by tokens so a loading ad never shifts the layout.
 */
@Component({
  selector: 'app-ad-slot',
  imports: [TranslatePipe],
  templateUrl: './ad-slot.component.html',
  styleUrl: './ad-slot.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
    'role': 'complementary',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class AdSlotComponent {
  readonly placement = input<AdSlotPlacement>('banner');
  private readonly i18n = inject(I18nService);
  readonly ariaLabel = computed(() => this.i18n.t('common.advertisement'));

  readonly enabled = AD_SLOTS_ENABLED;
  readonly hostClass = computed(
    () => `ad-slot ad-slot--${this.placement()}${this.enabled ? '' : ' ad-slot--off'}`
  );
}
