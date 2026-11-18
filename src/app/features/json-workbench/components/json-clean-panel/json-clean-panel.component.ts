import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  AfterViewInit,
  computed,
  input,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../../../components/ui/icon/icon.component';
import { ButtonComponent } from '../../../../components/ui/button/button.component';
import { EditorTextComponent } from '../editor-text/editor-text.component';
import { SettingsStore } from '../../../settings/settings.store';
import type { TranslationKey } from '../../../../core/i18n/en';
import type { JsonValue } from '../../state/workbench.store';
import {
  cleanJson,
  countJsonEntries,
  type JsonCleanOptions,
} from '../../utils/json-cleaner.utils';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

interface CleanToggle {
  key: keyof JsonCleanOptions;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
  sample: string;
}

const TOGGLES: CleanToggle[] = [
  { key: 'removeNull', labelKey: 'clean.null.label', hintKey: 'clean.null.hint', sample: 'null' },
  { key: 'removeEmptyStrings', labelKey: 'clean.emptyStrings.label', hintKey: 'clean.emptyStrings.hint', sample: '""' },
  { key: 'removeEmptyArrays', labelKey: 'clean.emptyArrays.label', hintKey: 'clean.emptyArrays.hint', sample: '[]' },
  { key: 'removeEmptyObjects', labelKey: 'clean.emptyObjects.label', hintKey: 'clean.emptyObjects.hint', sample: '{}' },
];

@Component({
  selector: 'app-json-clean-panel',
  imports: [TranslatePipe, IconComponent, ButtonComponent, EditorTextComponent],
  templateUrl: './json-clean-panel.component.html',
  styleUrl: './json-clean-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class JsonCleanPanelComponent implements AfterViewInit {
  readonly settings = inject(SettingsStore);
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
  readonly cleanedValue = computed(() => {
    const json = this.jsonValue();
    if (json === null) return null;
    return cleanJson(json, this.options()) ?? (Array.isArray(json) ? [] : {});
  });
  readonly previewText = computed(() => JSON.stringify(this.cleanedValue(), null, 2));
  readonly hasChanges = computed(() => this.jsonValue() !== null &&
    JSON.stringify(this.jsonValue()) !== JSON.stringify(this.cleanedValue()));

  selectAll(selected: boolean): void {
    this.options.set({ removeNull: selected, removeEmptyStrings: selected,
      removeEmptyArrays: selected, removeEmptyObjects: selected });
  }

  /** Live preview: how many entries the current options would remove. */
  readonly previewRemoved = computed<number>(() => {
    const json = this.jsonValue();
    if (json === null) return 0;
    const before = countJsonEntries(json);
    return before - countJsonEntries(this.cleanedValue()!);
  });

  ngAfterViewInit(): void {
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
    if (!this.anySelected() || !this.hasChanges()) return;
    this.applied.emit(this.options());
    this.close();
  }

  close(): void {
    const el = this.dialogRef()?.nativeElement;
    if (el && typeof el.close === 'function') el.close();
    this.closed.emit();
  }
}
