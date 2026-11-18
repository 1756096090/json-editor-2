import { Injectable, InjectionToken, computed, effect, inject } from '@angular/core';
import { SettingsStore } from '../../features/settings/settings.store';
import { EN, TranslationKey } from './en';
import { ES } from './es';
import { Lang, detectBrowserLanguage } from './language-detection';

export type TranslationParams = Readonly<Record<string, string | number>>;

/** Language detected from the browser (locale + time zone). Overridable in tests. */
export const BROWSER_LANGUAGE = new InjectionToken<Lang>('BROWSER_LANGUAGE', {
  providedIn: 'root',
  factory: detectBrowserLanguage,
});

const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = { en: EN, es: ES };

/**
 * Runtime translations. The language is `SettingsStore.language` when the user
 * picked one, otherwise the language detected from the browser (Spanish in
 * Spanish-speaking countries, English elsewhere).
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly settings = inject(SettingsStore);

  /** Detected once per page load from browser locale + time zone. */
  readonly detectedLang: Lang = inject(BROWSER_LANGUAGE);

  readonly lang = computed<Lang>(() => {
    const preference = this.settings.language();
    return preference === 'auto' ? this.detectedLang : preference;
  });

  constructor() {
    effect(() => {
      if (typeof document !== 'undefined') document.documentElement.lang = this.lang();
    });
  }

  /** Translate a key; `{name}` placeholders are filled from `params`. */
  t(key: TranslationKey, params?: TranslationParams): string {
    const text = DICTIONARIES[this.lang()][key] ?? EN[key] ?? key;
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match
    );
  }
}
