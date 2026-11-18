import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../components/ui/icon/icon.component';
import { ExplainModeService } from '../../components/ui/tooltip/explain-mode.service';
import { AppThemeId, DARK_THEMES, DarkThemeId } from '../../core/themes/app-themes';
import {
  LanguagePreference,
  SettingsStore,
} from '../../features/settings/settings.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../core/i18n/en';
import { CASE_TRANSFORMS, CaseTransform } from '../../core/case-transform';

/**
 * Settings dialog — Appearance (light/dark mode, dark palette) and Editor
 * (the "Convert case" selection tool).
 * All state lives in SettingsStore (persisted to localStorage there).
 */
@Component({
  selector: 'app-settings-panel',
  imports: [IconComponent, TranslatePipe],
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPanelComponent implements OnInit, OnDestroy {
  readonly settings = inject(SettingsStore);
  readonly explainMode = inject(ExplainModeService);
  private readonly i18n = inject(I18nService);
  readonly closed = output<void>();

  readonly darkThemes = DARK_THEMES;
  readonly caseTransforms = CASE_TRANSFORMS;

  /** Name of the language detected from the browser, in the current UI language. */
  readonly detectedLangKey: TranslationKey = this.i18n.detectedLang === 'es' ? 'lang.es' : 'lang.en';

  readonly languageOptions: readonly { value: LanguagePreference; labelKey: TranslationKey }[] = [
    { value: 'auto', labelKey: 'settings.languageAuto' },
    { value: 'es', labelKey: 'settings.languageEs' },
    { value: 'en', labelKey: 'settings.languageEn' },
  ];

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogRef');
  private previouslyFocused: HTMLElement | null = null;

  ngOnInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    const el = this.dialogRef()?.nativeElement;
    if (el && typeof el.showModal === 'function') el.showModal();
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus();
  }

  selectDarkTheme(id: DarkThemeId): void {
    this.settings.setDarkTheme(id);
  }

  selectLanguage(value: LanguagePreference): void {
    this.settings.setLanguage(value);
  }

  themeDescriptionKey(id: AppThemeId): TranslationKey {
    return `theme.${id}.desc`;
  }

  setCaseToolEnabled(enabled: boolean): void {
    this.settings.setCaseToolbarEnabled(enabled);
  }

  setCaseFormat(format: CaseTransform, enabled: boolean): void {
    this.settings.setCaseFormatEnabled(format, enabled);
  }

  close(): void {
    const el = this.dialogRef()?.nativeElement;
    if (el && typeof el.close === 'function') el.close();
    this.closed.emit();
  }

  /** Escape on a native dialog fires `cancel`: close through our own path. */
  onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  onBackdropClick(event: MouseEvent): void {
    const dialog = this.dialogRef()?.nativeElement;
    if (!dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (outside) this.close();
  }
}
