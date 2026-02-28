import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { format } from '../../../core/json.utils';

@Component({
  selector: 'app-json-preview',
  standalone: true,
  templateUrl: './json-preview.component.html',
  styleUrl: './json-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonPreviewComponent {
  readonly code = input<string>('');
  readonly valid = input<boolean>(false);
  readonly error = input<string>('');

  readonly prettyCode = computed(() => {
    if (!this.valid()) {
      return '';
    }

    try {
      return format(this.code());
    } catch {
      return this.code();
    }
  });
}
