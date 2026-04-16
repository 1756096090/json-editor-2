import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModuleBadgeComponent, ModuleState } from '../module-badge/module-badge.component';

/**
 * Tool card for the home grid and SEO tool suite.
 *
 * Rules (from README):
 *  - Name: always "JSON [Noun/Verb]" — 2–3 words max
 *  - Description: 1 line, verb + benefit
 *  - CTA: verb + tool name. "Open Formatter", "Try Validator"
 *  - coming-soon cards: CTA is "Notify me", card is dimmed
 *  - Max ONE badge per card; priority: most-used > new > recommended > coming-soon > premium
 */
@Component({
  selector: 'app-tool-card',
  imports: [RouterLink, ModuleBadgeComponent],
  templateUrl: './tool-card.component.html',
  styleUrl: './tool-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolCardComponent {
  readonly name = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input.required<string>();
  readonly state = input<ModuleState>('active');
  readonly route = input<string | null>(null);
  readonly ctaLabel = input<string>('Open');

  readonly notifyClicked = output<string>();

  readonly isComingSoon = computed(() => this.state() === 'coming-soon');
  readonly isLocked = computed(() => this.state() === 'locked');
  readonly isInteractive = computed(() => !this.isComingSoon() && !this.isLocked());

  onNotify(): void {
    this.notifyClicked.emit(this.name());
  }
}
