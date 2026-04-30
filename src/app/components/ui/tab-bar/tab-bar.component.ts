import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tab } from '../../../core/tabs.service';

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tab-bar.component.html',
  styleUrl: './tab-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class TabBarComponent {
  readonly tabs = input.required<Tab[]>();
  readonly activeTabId = input.required<string>();
  readonly panelLabel = input<string>('');
  readonly tabClicked = output<string>();
  readonly tabClosed = output<string>();
  readonly addTab = output<void>();
  readonly panelLabelChanged = output<string>();

  readonly isEditingLabel = signal(false);
  readonly editingLabelValue = signal('');
  private readonly labelInput = viewChild<ElementRef>('labelInput');

  private lastClickTime = 0;
  private readonly doubleClickDelay = 300;

  constructor(private cdr: ChangeDetectorRef) {}

  onLabelClick(): void {
    const now = Date.now();
    const isDoubleClick = now - this.lastClickTime < this.doubleClickDelay;
    this.lastClickTime = now;

    if (isDoubleClick) {
      this.startEditingLabel();
    }
  }

  startEditingLabel(): void {
    this.editingLabelValue.set(this.panelLabel());
    this.isEditingLabel.set(true);
    this.cdr.markForCheck();

    setTimeout(() => {
      const input = this.labelInput()?.nativeElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  }

  onLabelEditFinish(): void {
    const newLabel = this.editingLabelValue().trim();
    const currentLabel = this.panelLabel().trim();

    if (newLabel && newLabel !== currentLabel) {
      this.panelLabelChanged.emit(newLabel);
    }
    this.isEditingLabel.set(false);
    this.lastClickTime = 0;
    this.cdr.markForCheck();
  }
}
