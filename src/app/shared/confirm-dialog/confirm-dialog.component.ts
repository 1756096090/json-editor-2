import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';

export interface ConfirmDialogResult {
  confirmed: boolean;
  dontAskAgain: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)'
  }
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  readonly title         = input<string>('Confirmar');
  readonly message       = input<string>('¿Deseas continuar?');
  readonly confirmText   = input<string>('Confirmar');
  readonly cancelText    = input<string>('Cancelar');
  readonly showDontAsk   = input<boolean>(false);
  readonly warningText   = input<string>('');
  readonly confirmDisabled = input<boolean>(false);

  readonly closed = output<ConfirmDialogResult>();

  readonly dontAskAgain = signal<boolean>(false);

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogRef');
  private readonly confirmBtnRef = viewChild<ElementRef<HTMLButtonElement>>('confirmBtnRef');

  private previouslyFocused: HTMLElement | null = null;

  ngOnInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement;

    // Open native dialog for backdrop + focus-trap support
    const el = this.dialogRef()?.nativeElement;
    if (el) {
      el.showModal();
    }

    // Focus the confirm or cancel button after render
    requestAnimationFrame(() => {
      const btn = this.confirmBtnRef()?.nativeElement;
      btn?.focus();
    });
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus();
  }

  confirm(): void {
    const el = this.dialogRef()?.nativeElement;
    el?.close();
    this.closed.emit({ confirmed: true, dontAskAgain: this.dontAskAgain() });
  }

  cancel(): void {
    const el = this.dialogRef()?.nativeElement;
    el?.close();
    this.closed.emit({ confirmed: false, dontAskAgain: false });
  }

  toggleDontAsk(): void {
    this.dontAskAgain.update((v) => !v);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    }
    if (event.key === 'Enter' && !this.confirmDisabled()) {
      const target = event.target as HTMLElement;
      // Only confirm when not already on a button (avoid double-fire)
      if (target.tagName !== 'BUTTON') {
        event.preventDefault();
        this.confirm();
      }
    }
  }

  onBackdropClick(event: MouseEvent): void {
    const dialog = this.dialogRef()?.nativeElement;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const clickedOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top  ||
      event.clientY > rect.bottom;
    if (clickedOutside) this.cancel();
  }
}
