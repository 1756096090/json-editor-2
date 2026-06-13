import { InjectionToken } from '@angular/core';

/**
 * Pluggable translation backend.
 * Implement this interface (Google Translate, DeepL, OpenAI, self-hosted…)
 * and override the TRANSLATION_PROVIDER token to enable real translation.
 * API keys must live in a backend — never hardcode them in the frontend.
 */
export interface TranslationProvider {
  /** False when no real backend is configured — the UI shows a hint instead of calling out. */
  readonly enabled: boolean;
  translateText(value: string, sourceLang: string, targetLang: string): Promise<string>;
}

export const TRANSLATION_NOT_CONFIGURED_MESSAGE =
  'Configure a translation provider to enable automatic translation.';

/** Default no-op provider: keeps the UI functional but translation disabled. */
export class UnconfiguredTranslationProvider implements TranslationProvider {
  readonly enabled = false;

  translateText(): Promise<string> {
    return Promise.reject(new Error(TRANSLATION_NOT_CONFIGURED_MESSAGE));
  }
}

export const TRANSLATION_PROVIDER = new InjectionToken<TranslationProvider>(
  'TRANSLATION_PROVIDER',
  {
    providedIn: 'root',
    factory: () => new UnconfiguredTranslationProvider(),
  }
);
