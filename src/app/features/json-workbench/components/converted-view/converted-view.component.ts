import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EditorTextComponent } from '../editor-text/editor-text.component';
import { EmptyStateComponent } from '../../../../components/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-converted-view',
  imports: [EditorTextComponent, EmptyStateComponent],
  template: `
    <div class="editor-panel__surface">
      @if (shouldShowContent()) {
        <app-editor-text
          [value]="content()"
          [language]="language()"
          [theme]="theme()"
          [readOnly]="true"
          [ariaLabel]="ariaLabel()"
        />
      } @else {
        <app-empty-state
          [title]="emptyTitle()"
          [description]="emptyDescription()"
        />
      }
    </div>
  `,
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

  readonly shouldShowContent = computed(() => {
    const hasValid = this.hasValidInput();
    const contentValue = this.content();
    console.log('[ConvertedView] shouldShowContent:', hasValid, 'content length:', contentValue.length, 'content:', contentValue.substring(0, 50));
    return hasValid;
  });
}
