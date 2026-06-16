import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../../../components/ui/icon/icon.component';
import { ButtonComponent } from '../../../../components/ui/button/button.component';
import type { JsonValue } from '../../state/workbench.store';
import {
  cleanJson,
  countJsonEntries,
  type JsonCleanOptions,
} from '../../utils/json-cleaner.utils';

interface CleanToggle {
  key: keyof JsonCleanOptions;
  label: string;
  hint: string;
}

const TOGGLES: CleanToggle[] = [
  { key: 'removeNull', label: 'Remove null values', hint: 'Drops keys/items whose value is null.' },
  { key: 'removeEmptyStrings', label: 'Remove empty strings', hint: 'Drops "" values.' },
  { key: 'removeEmptyArrays', label: 'Remove empty arrays', hint: 'Drops [] once emptied.' },
  { key: 'removeEmptyObjects', label: 'Remove empty objects', hint: 'Drops {} once emptied.' },
];

@Component({
  selector: 'app-json-clean-panel',
  imports: [IconComponent, ButtonComponent],
  templateUrl: './json-clean-panel.component.html',
  styleUrl: './json-clean-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class JsonCleanPanelComponent implements OnInit {
  /** Parsed JSON to be cleaned. Null means no valid JSON. */
  readonly jsonValue = input<JsonValue | null>(null);

  readonly closed = output<void>();
  readonly applied = output<JsonCleanOptions>();

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogRef');

  readonly toggles = TOGGLES;
  readonly options = signal<JsonCleanOptions>({
    removeNull: true,
    removeEmptyStrings: true,
    removeEmptyArrays: true,
    removeEmptyObjects: true,
  });

  readonly anySelected = computed<boolean>(() =>
    Object.values(this.options()).some(Boolean)
  );

  /** Live preview: how many entries the current options would remove. */
  readonly previewRemoved = computed<number>(() => {
    const json = this.jsonValue();
    if (json === null) return 0;
    const before = countJsonEntries(json);
    const fallback: JsonValue = Array.isArray(json) ? [] : {};
    const after = cleanJson(json, this.options()) ?? fallback;
    return before - countJsonEntries(after);
  });

  ngOnInit(): void {
    const el = this.dialogRef()?.nativeElement;
    if (el && typeof el.showModal === 'function') el.showModal();
  }

  isChecked(key: keyof JsonCleanOptions): boolean {
    return this.options()[key];
  }

  toggle(key: keyof JsonCleanOptions): void {
    this.options.update((o) => ({ ...o, [key]: !o[key] }));
  }

  apply(): void {
    if (!this.anySelected()) return;
    this.applied.emit(this.options());
    this.close();
  }

  close(): void {
    const el = this.dialogRef()?.nativeElement;
    if (el && typeof el.close === 'function') el.close();
    this.closed.emit();
  }
}
