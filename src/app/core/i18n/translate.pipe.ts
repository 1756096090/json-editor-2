import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationKey } from './en';
import { I18nService, TranslationParams } from './i18n.service';

/**
 * `{{ 'home.title' | t }}` or `{{ 'tabs.close' | t: { name: tab.label } }}`.
 * Impure so templates re-render when the language signal changes.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: TranslationKey, params?: TranslationParams): string {
    return this.i18n.t(key, params);
  }
}
