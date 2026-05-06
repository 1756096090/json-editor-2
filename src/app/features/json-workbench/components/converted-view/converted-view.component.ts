import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EditorTextComponent } from '../editor-text/editor-text.component';
import { EmptyStateComponent } from '../../../../components/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-converted-view',
  imports: [EditorTextComponent, EmptyStateComponent],
  templateUrl: './converted-view.component.html',
  styleUrl: './converted-view.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConvertedViewComponent {
  readonly content = input<string>('');
  readonly hasValidInput = input<boolean>(false);
  readonly language = input<string>('plaintext');
  readonly theme = input<'dark' | 'light'>('dark');
  readonly ariaLabel = input<string>('Converted output (read-only)');
  readonly emptyTitle = input<string>('No valid JSON to convert');
  readonly emptyDescription = input<string>(
    'Switch to Text mode, paste valid JSON, then come back to this view.'
  );

  readonly shouldShowContent = computed(() => this.hasValidInput());
}
