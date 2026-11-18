import { detectLanguage, isSpanishSpeakingTimeZone, regionOf } from './language-detection';

describe('detectLanguage', () => {
  it('uses Spanish when the browser prefers Spanish, wherever the user is', () => {
    expect(detectLanguage(['es-ES', 'en'], 'Europe/Madrid')).toBe('es');
    expect(detectLanguage(['es'], 'America/New_York')).toBe('es');
    expect(detectLanguage(['es-419'], undefined)).toBe('es');
  });

  it('uses Spanish for an English browser in a Spanish-speaking country (region subtag)', () => {
    expect(detectLanguage(['en-MX'], 'UTC')).toBe('es');
    expect(detectLanguage(['en-US', 'ca-ES'], 'UTC')).toBe('es');
  });

  it('uses Spanish for an English browser in a Spanish-speaking time zone', () => {
    expect(detectLanguage(['en-US'], 'America/Bogota')).toBe('es');
    expect(detectLanguage(['en'], 'America/Argentina/Buenos_Aires')).toBe('es');
    expect(detectLanguage(['en-GB'], 'Atlantic/Canary')).toBe('es');
  });

  it('uses English everywhere else', () => {
    expect(detectLanguage(['en-US'], 'America/New_York')).toBe('en');
    expect(detectLanguage(['pt-BR'], 'America/Sao_Paulo')).toBe('en');
    expect(detectLanguage(['fr-FR', 'es'], 'Europe/Paris')).toBe('en');
    expect(detectLanguage([], undefined)).toBe('en');
  });
});

describe('language detection helpers', () => {
  it('extracts the region subtag', () => {
    expect(regionOf('es-MX')).toBe('MX');
    expect(regionOf('zh-Hant-TW')).toBe('TW');
    expect(regionOf('es_ar')).toBe('AR');
    expect(regionOf('es-419')).toBe('419');
    expect(regionOf('en')).toBeNull();
  });

  it('recognises Spanish-speaking time zones', () => {
    expect(isSpanishSpeakingTimeZone('Europe/Madrid')).toBe(true);
    expect(isSpanishSpeakingTimeZone('America/Argentina/Cordoba')).toBe(true);
    expect(isSpanishSpeakingTimeZone('America/Los_Angeles')).toBe(false);
  });
});
