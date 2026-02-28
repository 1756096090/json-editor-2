import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentItem {
  value: string;
  label: string;
}

@Component({
  selector: 'app-segmented-control',
  templateUrl: './segmented-control.component.html',
  styleUrl: './segmented-control.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SegmentedControlComponent {
  readonly items = input.required<SegmentItem[]>();
  readonly value = input.required<string>();
  readonly ariaLabel = input<string>('');

  readonly valueChange = output<string>();

  select(item: SegmentItem): void {
    if (item.value !== this.value()) {
      this.valueChange.emit(item.value);
    }
  }

  trackByValue(_index: number, item: SegmentItem): string {
    return item.value;
  }
}
