import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'default' | 'accent' | 'ghost' | 'danger' | 'active';
export type ButtonSize = 'sm' | 'md';

@Component({
  selector: 'app-ui-button',
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  readonly ariaPressed = input<boolean | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly tooltipText = input<string>('');

  readonly pressed = output<MouseEvent>();

  readonly hostClass = computed(() => {
    const classes = ['ui-btn', `ui-btn--${this.variant()}`, `ui-btn--${this.size()}`];
    return classes.join(' ');
  });

  onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    this.pressed.emit(event);
  }
}
