import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FixLabel } from '../../features/json-workbench/utils/auto-fix-json';

export type AutoFixModalMode = 'accept' | 'failure';
export interface AutoFixModalResult {
  /** 'accept' → apply fix; 'keep' → keep pasted text; 'revert' → undo paste */
  action: 'accept' | 'keep' | 'revert';
}

const FIX_LABELS: Record<FixLabel, string> = {
  'trim':            'Espacios extra',
  'bom':             'Caracteres ocultos',
  'trailing-commas': 'Comas extra',
  'single-quotes':   'Comillas simples',
  'close-brackets':  'Corchetes sin cerrar',
  'extract-block':   'Bloque JSON extraído',
  'combined':        'Correcciones combinadas',
};

@Component({
  selector: 'app-auto-fix-modal',
  templateUrl: './auto-fix-modal.component.html',
  styleUrl: './auto-fix-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AutoFixModalComponent implements OnInit, OnDestroy {
  /** Whether we are showing a fix proposal or an error. */
  readonly mode         = input.required<AutoFixModalMode>();
  /** Original (pasted) text — used in accept mode for comparison. */
  readonly originalText = input<string>('');
  /** Proposed fixed text — used in accept mode. */
  readonly fixedText    = input<string>('');
  /** Labels describing each applied transformation. */
  readonly appliedFixes = input<FixLabel[]>([]);
  /** Human-readable parse error — used in failure mode. */
  readonly errorMessage = input<string>('');

  readonly closed = output<AutoFixModalResult>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialogRef');

  protected readonly fixLabelNames = FIX_LABELS;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const el = this.dialogRef().nativeElement;
    el.showModal();
    el.addEventListener('keydown', this.onKeyDown);
    el.addEventListener('cancel', this.onNativeCancel);
  }

  ngOnDestroy(): void {
    const el = this.dialogRef().nativeElement;
    el.removeEventListener('keydown', this.onKeyDown);
    el.removeEventListener('cancel', this.onNativeCancel);
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  accept(): void {
    this.close({ action: 'accept' });
  }

  keep(): void {
    this.close({ action: 'keep' });
  }

  revert(): void {
    this.close({ action: 'revert' });
  }

  onBackdropClick(event: MouseEvent): void {
    const rect = this.dialogRef().nativeElement.getBoundingClientRect();
    const { clientX: x, clientY: y } = event;
    const outside = x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
    if (outside) this.close({ action: this.mode() === 'accept' ? 'keep' : 'keep' });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private close(result: AutoFixModalResult): void {
    this.dialogRef().nativeElement.close();
    this.closed.emit(result);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close({ action: 'keep' });
    }
    if (event.key === 'Enter' && this.mode() === 'accept') {
      const tag = (event.target as HTMLElement).tagName;
      if (tag !== 'BUTTON') {
        event.preventDefault();
        this.accept();
      }
    }
  };

  private readonly onNativeCancel = (event: Event): void => {
    event.preventDefault();
    this.close({ action: 'keep' });
  };
}
