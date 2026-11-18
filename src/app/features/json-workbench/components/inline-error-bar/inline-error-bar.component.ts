/**
 * inline-error-bar.component.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Inline error bar shown inside an editor panel when JSON parsing fails.
 * Features: warning icon, error message with line/col, "Show me" and "Auto repair" buttons.
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../../../components/ui/icon/icon.component';
import { TooltipDirective } from '../../../../components/ui/tooltip/tooltip.directive';
import type { JsonErrorPosition } from '../../../../core/json-error.utils';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-inline-error-bar',
  imports: [TranslatePipe, IconComponent, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inline-error-bar.component.html',
  styleUrl: './inline-error-bar.component.css',
})
export class InlineErrorBarComponent {
  /** The parsed JSON error. */
  readonly error = input.required<JsonErrorPosition>();
  /** Whether auto-fix button should be shown. */
  readonly autoFixEnabled = input<boolean>(true);

  /** Emitted when user clicks "Show me". */
  readonly showMe = output<void>();
  /** Emitted when user clicks "Auto repair". */
  readonly autoRepair = output<void>();
}
