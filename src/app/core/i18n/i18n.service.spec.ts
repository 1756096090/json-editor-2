import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import { EN, TranslationKey } from './en';
import { ES } from './es';
import { SettingsStore } from '../../features/settings/settings.store';
import { useMemoryStorage } from '../../testing/memory-storage';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('I18nService', () => {
  beforeEach(() => {
    useMemoryStorage();
  });

  function setup() {
    const i18n = TestBed.inject(I18nService);
    const settings = TestBed.inject(SettingsStore);
    TestBed.tick();
    return { i18n, settings };
  }

  it('follows the detected browser language while the preference is auto', () => {
    const { i18n, settings } = setup();
    expect(settings.language()).toBe('auto');
    expect(i18n.lang()).toBe(i18n.detectedLang);
  });

  it('lets the user force Spanish or English', () => {
    const { i18n, settings } = setup();
    settings.setLanguage('es');
    expect(i18n.lang()).toBe('es');
    expect(i18n.t('common.close')).toBe('Cerrar');

    settings.setLanguage('en');
    expect(i18n.lang()).toBe('en');
    expect(i18n.t('common.close')).toBe('Close');
  });

  it('sets the document language for screen readers and search engines', () => {
    const { settings } = setup();
    settings.setLanguage('es');
    TestBed.tick();
    expect(document.documentElement.lang).toBe('es');
    settings.setLanguage('en');
    TestBed.tick();
    expect(document.documentElement.lang).toBe('en');
  });

  it('fills {placeholders} from params', () => {
    const { i18n, settings } = setup();
    settings.setLanguage('en');
    const key = (Object.keys(EN) as TranslationKey[]).find((k) => placeholders(EN[k]).length > 0);
    if (!key) return; // no parameterised strings yet
    const params = Object.fromEntries(placeholders(EN[key]).map((name) => [name, `<${name}>`]));
    const text = i18n.t(key, params);
    for (const name of placeholders(EN[key])) expect(text).toContain(`<${name}>`);
    expect(text).not.toMatch(/\{\w+\}/);
  });

  it('persists the language preference', () => {
    const { settings } = setup();
    settings.setLanguage('es');
    TestBed.tick();
    expect(JSON.parse(window.localStorage.getItem('json-we-format:settings')!).language).toBe('es');
  });
});

describe('dictionaries', () => {
  it('translate every key into Spanish with the same placeholders', () => {
    for (const key of Object.keys(EN) as TranslationKey[]) {
      expect(ES[key], key).toBeTruthy();
      expect(placeholders(ES[key]), key).toEqual(placeholders(EN[key]));
    }
  });

  it('have no extra Spanish keys', () => {
    expect(Object.keys(ES).sort()).toEqual(Object.keys(EN).sort());
  });
});
