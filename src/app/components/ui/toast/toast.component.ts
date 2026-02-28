import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  effect,
  input,
  signal
} from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  text: string;
  type: ToastType;
  id: number;
}

const TOAST_DURATION_MS = 3500;
let nextId = 0;

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  /** The incoming message string triggers a new toast */
  readonly message = input<string>('');

  readonly toasts = signal<ToastMessage[]>([]);

  constructor() {
    effect(() => {
      const msg = this.message();
      if (!msg) return;

      const id = nextId++;
      const type = this.inferType(msg);

      this.toasts.update(list => [...list, { text: msg, type, id }]);

      setTimeout(() => {
        this.dismiss(id);
      }, TOAST_DURATION_MS);
    });
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  getTypeClass(type: ToastType): string {
    return `toast__item toast__item--${type}`;
  }

  getIcon(type: ToastType): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      default:
        return 'ℹ';
    }
  }

  trackById(_index: number, toast: ToastMessage): number {
    return toast.id;
  }

  private inferType(msg: string): ToastType {
    const lower = msg.toLowerCase();
    if (lower.includes('fail') || lower.includes('error') || lower.includes('cannot') || lower.includes('not available')) {
      return 'error';
    }
    if (lower.includes('copied') || lower.includes('formatted') || lower.includes('minified')
      || lower.includes('loaded') || lower.includes('download') || lower.includes('pasted')
      || lower.includes('updated') || lower.includes('enabled')) {
      return 'success';
    }
    return 'info';
  }
}
