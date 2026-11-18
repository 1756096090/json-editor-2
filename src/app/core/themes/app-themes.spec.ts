import {
  APP_THEMES,
  DARK_THEMES,
  DARK_THEME_IDS,
  DEFAULT_DARK_THEME,
  isDarkThemeId,
  monacoThemeName,
} from './app-themes';

describe('app themes registry', () => {
  it('offers exactly the four dark themes, Visual Studio Dark first and default', () => {
    expect(DARK_THEME_IDS).toEqual([
      'visual-studio-dark',
      'one-dark-pro',
      'dracula',
      'jetbrains-islands-dark',
    ]);
    expect(DEFAULT_DARK_THEME).toBe('visual-studio-dark');
  });

  it('recognises only known dark theme ids', () => {
    expect(isDarkThemeId('dracula')).toBe(true);
    expect(isDarkThemeId('light')).toBe(false);
    expect(isDarkThemeId('solarized')).toBe(false);
    expect(isDarkThemeId(undefined)).toBe(false);
  });

  it('gives every theme a unique Monaco theme name', () => {
    const names = APP_THEMES.map((theme) => monacoThemeName(theme.id));
    expect(new Set(names).size).toBe(APP_THEMES.length);
  });

  it.each(APP_THEMES.map((theme) => [theme.id, theme] as const))(
    '%s colors keys, strings, numbers, booleans, null, selection, cursor and active line',
    (_id, theme) => {
      const tokens = theme.monaco.rules.map((rule) => rule.token);
      expect(tokens).toEqual(
        expect.arrayContaining([
          'string.key.json',
          'string.value.json',
          'number.json',
          'keyword.json',
          'keyword.null',
        ])
      );

      const color = (token: string) =>
        theme.monaco.rules.find((rule) => rule.token === token)?.foreground;
      const syntax = ['string.key.json', 'string.value.json', 'number.json', 'keyword.json', 'keyword.null'].map(color);
      expect(new Set(syntax).size).toBe(syntax.length);

      for (const key of [
        'editor.background',
        'editor.selectionBackground',
        'editorCursor.foreground',
        'editor.lineHighlightBackground',
      ]) {
        expect(theme.monaco.colors[key]).toMatch(/^#[0-9a-f]{6,8}$/i);
      }
    }
  );

  it('builds every dark Monaco theme on the vs-dark base', () => {
    for (const theme of DARK_THEMES) {
      expect(theme.monaco.base).toBe('vs-dark');
    }
  });
});
