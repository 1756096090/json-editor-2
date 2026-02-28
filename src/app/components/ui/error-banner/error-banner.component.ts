import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-banner',
  templateUrl: './error-banner.component.html',
  styleUrl: './error-banner.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorBannerComponent {
  readonly message = input.required<string>();
  readonly dismissible = input<boolean>(false);

  readonly dismissed = output<void>();

  onDismiss(): void {
    this.dismissed.emit();
  }
}
