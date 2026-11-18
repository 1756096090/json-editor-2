import { Provider } from '@angular/core';
import { BROWSER_LANGUAGE } from './app/core/i18n/i18n.service';

/**
 * Providers applied to every TestBed (see angular.json → test.options.providersFile).
 * Specs run in English regardless of the machine's locale or time zone.
 */
const testProviders: Provider[] = [{ provide: BROWSER_LANGUAGE, useValue: 'en' }];

export default testProviders;
