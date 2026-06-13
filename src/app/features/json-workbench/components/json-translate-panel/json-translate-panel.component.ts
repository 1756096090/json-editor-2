import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../../../components/ui/icon/icon.component';
import { ButtonComponent } from '../../../../components/ui/button/button.component';
import type { JsonValue } from '../../state/workbench.store';
import {
  translateJsonStringValues,
  type TranslateJsonStats,
} from '../../utils/json-value-translator';
import {
  TRANSLATION_PROVIDER,
  TRANSLATION_NOT_CONFIGURED_MESSAGE,
} from '../../services/translation-provider';
import { copyTextToClipboard } from '../../utils/file-utils';

export type TranslateTarget = 'same' | 'other';

export interface TranslateApplyEvent {
  text: string;
  target: TranslateTarget;
}

interface LangOption {
  code: string;
  label: string;
}

const LANGUAGES: LangOption[] = [
  { code: 'auto', label: 'Detect' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
];

@Component({
  selector: 'app-json-translate-panel',
  imports: [IconComponent, ButtonComponent],
  templateUrl: './json-translate-panel.component.html',
  styleUrl: './json-translate-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class JsonTranslatePanelComponent implements OnInit {
  /** Parsed JSON to translate. Null means no valid JSON was provided. */
  readonly jsonValue = input<JsonValue | null>(null);
  /** True when the right panel exists and can receive the result. */
  readonly canSendToOther = input<boolean>(true);

  readonly closed = output<void>();
  readonly applied = output<TranslateApplyEvent>();
  readonly statusMessage = output<string>();

  private readonly provider = inject(TRANSLATION_PROVIDER);
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogRef');

  readonly languages = LANGUAGES;
  readonly providerEnabled = this.provider.enabled;
  readonly disabledMessage = TRANSLATION_NOT_CONFIGURED_MESSAGE;

  readonly sourceLang = signal<string>('auto');
  readonly targetLang = signal<string>('es');
  readonly target = signal<TranslateTarget>('same');

  readonly translating = signal<boolean>(false);
  readonly stats = signal<TranslateJsonStats | null>(null);
  readonly resultText = signal<string>('');
  readonly errorMessage = signal<string>('');

  ngOnInit(): void {
    const el = this.dialogRef()?.nativeElement;
    if (el && typeof el.showModal === 'function') el.showModal();
  }

  setSource(value: string): void { this.sourceLang.set(value); }
  setTarget(value: string): void { this.targetLang.set(value); }
  setApplyTarget(value: TranslateTarget): void { this.target.set(value); }

  async translate(): Promise<void> {
    const value = this.jsonValue();
    if (value === null) {
      this.errorMessage.set('Paste valid JSON before translating.');
      return;
    }
    if (!this.provider.enabled) {
      this.errorMessage.set(this.disabledMessage);
      return;
    }

    this.translating.set(true);
    this.errorMessage.set('');
    this.stats.set(null);
    this.resultText.set('');

    try {
      const result = await translateJsonStringValues(
        value,
        (text, src, tgt) => this.provider.translateText(text, src, tgt),
        this.sourceLang(),
        this.targetLang()
      );
      this.stats.set(result.stats);
      this.resultText.set(JSON.stringify(result.value, null, 2));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Translation failed.');
    } finally {
      this.translating.set(false);
    }
  }

  apply(): void {
    const text = this.resultText();
    if (!text) return;
    this.applied.emit({ text, target: this.target() });
    this.close();
  }

  async copyResult(): Promise<void> {
    const text = this.resultText();
    if (!text) return;
    try {
      await copyTextToClipboard(text);
      this.statusMessage.emit('Translated JSON copied to clipboard.');
    } catch {
      this.statusMessage.emit('Copy failed.');
    }
  }

  close(): void {
    const el = this.dialogRef()?.nativeElement;
    if (el && typeof el.close === 'function') el.close();
    this.closed.emit();
  }
}
