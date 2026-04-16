import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';

const MIN_PERCENT = 20;
const MAX_PERCENT = 80;
const STORAGE_KEY = 'json-we-format:split-ratio';

@Component({
  selector: 'app-split-pane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './split-pane.component.html',
  styleUrl: './split-pane.component.css',
  host: {
    // Absolute fill of .workbench__panels (position:relative).
    // This gives the split-pane a DEFINITE size without relying on
    // percentage-height resolution against a flex-only parent.
    style: 'position: absolute; inset: 0; display: block;'
  }
})
export class SplitPaneComponent {
  /** Direction of split: 'horizontal' splits left/right, 'vertical' splits top/bottom */
  readonly direction = input<'horizontal' | 'vertical'>('horizontal');

  /** Persist ratio to localStorage under a custom key */
  readonly storageKey = input<string>(STORAGE_KEY);

  /** When true, hides the gutter and right/bottom panel — left/top panel fills 100%. */
  readonly hideEnd = input<boolean>(false);

  /** Emits the current left-panel ratio (0–100) whenever it changes. */
  readonly ratioChange = output<number>();

  readonly container = viewChild.required<ElementRef<HTMLElement>>('container');

  /** Left/top panel size as percentage */
  readonly ratio = signal(50);

  /** Gutter width in px — must match CSS `.split-pane__gutter { width }` */
  private readonly gutterPx = 6;

  readonly leftStyle = computed(() => {
    if (this.hideEnd()) {
      return this.direction() === 'horizontal'
        ? 'width: 100%; height: 100%'
        : 'height: 100%; width: 100%';
    }
    const r = this.ratio();
    const g = this.gutterPx;
    return this.direction() === 'horizontal'
      ? `width: calc(${r}% - ${g / 2}px); height: 100%`
      : `height: calc(${r}% - ${g / 2}px); width: 100%`;
  });

  readonly rightStyle = computed(() => {
    const r = this.ratio();
    const g = this.gutterPx;
    return this.direction() === 'horizontal'
      ? `width: calc(${100 - r}% - ${g / 2}px); height: 100%`
      : `height: calc(${100 - r}% - ${g / 2}px); width: 100%`;
  });

  readonly containerClass = computed(
    () => `split-pane split-pane--${this.direction()}`
  );

  private dragging = false;

  constructor() {
    this.restoreRatio();

    effect(() => {
      const key = this.storageKey();
      const r = this.ratio();
      this.saveRatio(key, r);
      this.ratioChange.emit(r);
    });
  }

  onGutterPointerDown(event: PointerEvent): void {
    event.preventDefault();
    const gutter = event.target as HTMLElement;
    gutter.setPointerCapture(event.pointerId);
    this.dragging = true;
  }

  onGutterPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;

    const containerEl = this.container().nativeElement;
    const rect = containerEl.getBoundingClientRect();

    let percent: number;
    if (this.direction() === 'horizontal') {
      percent = ((event.clientX - rect.left) / rect.width) * 100;
    } else {
      percent = ((event.clientY - rect.top) / rect.height) * 100;
    }

    this.ratio.set(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, percent)));
  }

  onGutterPointerUp(event: PointerEvent): void {
    this.dragging = false;
    const gutter = event.target as HTMLElement;
    gutter.releasePointerCapture(event.pointerId);
  }

  resetRatio(): void {
    this.ratio.set(50);
  }

  onGutterKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 5 : 1;
    const isHorizontal = this.direction() === 'horizontal';

    const increaseKeys = isHorizontal ? ['ArrowRight'] : ['ArrowDown'];
    const decreaseKeys = isHorizontal ? ['ArrowLeft'] : ['ArrowUp'];

    if (increaseKeys.includes(event.key)) {
      event.preventDefault();
      this.ratio.update(r => Math.min(MAX_PERCENT, r + step));
    } else if (decreaseKeys.includes(event.key)) {
      event.preventDefault();
      this.ratio.update(r => Math.max(MIN_PERCENT, r - step));
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.ratio.set(MIN_PERCENT);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.ratio.set(MAX_PERCENT);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.resetRatio();
    }
  }

  private restoreRatio(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.storageKey());
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= MIN_PERCENT && val <= MAX_PERCENT) {
          this.ratio.set(val);
        }
      }
    } catch { /* ignore */ }
  }

  private saveRatio(key: string, value: number): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, String(Math.round(value * 100) / 100));
    } catch { /* ignore */ }
  }
}
