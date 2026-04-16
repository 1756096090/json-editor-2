import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonComponent } from '../../../../components/ui/button/button.component';
import type { DiffResult } from '../../utils/diff-engine';

@Component({
  selector: 'app-diff-bar',
  imports: [ButtonComponent],
  templateUrl: './diff-bar.component.html',
  styleUrl: './diff-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiffBarComponent {
  readonly diffResult  = input<DiffResult | null>(null);
  readonly computing   = input<boolean>(false);
  readonly currentHunkIndex = input<number>(-1);

  readonly prevHunk            = output<void>();
  readonly nextHunk            = output<void>();
  readonly closeDiff           = output<void>();

  readonly hunkCount    = computed(() => this.diffResult()?.hunks.length ?? 0);
  readonly addedCount   = computed(() => this.diffResult()?.addedCount ?? 0);
  readonly removedCount = computed(() => this.diffResult()?.removedCount ?? 0);

  readonly navLabel = computed(() => {
    const idx   = this.currentHunkIndex();
    const count = this.hunkCount();
    if (count === 0) return '– / 0';
    return `${idx >= 0 ? idx + 1 : '–'} / ${count}`;
  });
}
