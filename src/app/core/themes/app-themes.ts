import type { editor } from 'monaco-editor';

/**
 * Central registry of JSON Hunt visual themes.
 *
 * The UI colors live as CSS tokens in `src/styles.scss` (one block per theme,
 * selected by `data-theme` + `data-dark-theme` on <html>). Monaco cannot read
 * CSS custom properties, so each theme's editor palette is mirrored here as hex.
 * Keep both in sync when a palette changes.
 */

export type DarkThemeId =
  | 'visual-studio-dark'
  | 'one-dark-pro'
  | 'dracula'
  | 'jetbrains-islands-dark';

export type AppThemeId = 'light' | DarkThemeId;

export const DEFAULT_DARK_THEME: DarkThemeId = 'visual-studio-dark';

export interface AppThemeDefinition<Id extends AppThemeId = AppThemeId> {
  readonly id: Id;
  readonly label: string;
  readonly description: string;
  readonly monaco: editor.IStandaloneThemeData;
}

/** Editor palette a Monaco theme is generated from (hex without alpha unless noted). */
interface EditorPalette {
  readonly base: 'vs' | 'vs-dark';
  readonly background: string;
  readonly foreground: string;
  readonly gutter: string;
  readonly lineHighlight: string;
  readonly selection: string;
  readonly inactiveSelection: string;
  readonly cursor: string;
  readonly lineNumber: string;
  readonly lineNumberActive: string;
  readonly indentGuide: string;
  readonly indentGuideActive: string;
  readonly accent: string;
  readonly widget: string;
  readonly widgetBorder: string;
  readonly inputBorder: string;
  readonly findMatch: string;
  readonly scrollbar: string;
  readonly success: string;
  readonly danger: string;
  readonly key: string;
  readonly string: string;
  readonly number: string;
  readonly boolean: string;
  readonly null: string;
  readonly punctuation: string;
}

const hex = (color: string): string => color.replace('#', '');

function buildMonacoTheme(
  p: EditorPalette,
  colorOverrides: editor.IColors = {}
): editor.IStandaloneThemeData {
  return {
    base: p.base,
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: hex(p.key) },
      { token: 'string.value.json', foreground: hex(p.string) },
      { token: 'number.json', foreground: hex(p.number) },
      { token: 'number', foreground: hex(p.number) },
      { token: 'keyword.json', foreground: hex(p.boolean) },
      { token: 'keyword', foreground: hex(p.boolean) },
      { token: 'keyword.null', foreground: hex(p.null), fontStyle: 'italic' },
      { token: 'delimiter.bracket.json', foreground: hex(p.punctuation) },
      { token: 'delimiter.array.json', foreground: hex(p.punctuation) },
      { token: 'delimiter.colon.json', foreground: hex(p.punctuation) },
      { token: 'delimiter.comma.json', foreground: hex(p.punctuation) },
    ],
    colors: {
      'editor.background': p.background,
      'editor.foreground': p.foreground,
      'editor.lineHighlightBackground': p.lineHighlight,
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': p.selection,
      'editor.inactiveSelectionBackground': p.inactiveSelection,
      'editorCursor.foreground': p.cursor,
      'editorGutter.background': p.gutter,
      'editorLineNumber.foreground': p.lineNumber,
      'editorLineNumber.activeForeground': p.lineNumberActive,
      'editorIndentGuide.background': p.indentGuide,
      'editorIndentGuide.activeBackground': p.indentGuideActive,
      'editorBracketMatch.background': `${p.accent}26`,
      'editorBracketMatch.border': p.accent,
      'editor.findMatchBackground': p.findMatch,
      'editor.findMatchHighlightBackground': `${p.accent}33`,
      'editorOverviewRuler.border': '#00000000',
      'editorWidget.background': p.widget,
      'editorWidget.border': p.widgetBorder,
      'input.background': p.background,
      'input.foreground': p.foreground,
      'input.border': p.inputBorder,
      'focusBorder': p.accent,
      'diffEditor.insertedTextBackground': `${p.success}26`,
      'diffEditor.removedTextBackground': `${p.danger}26`,
      'diffEditor.insertedLineBackground': `${p.success}1a`,
      'diffEditor.removedLineBackground': `${p.danger}1a`,
      'scrollbarSlider.background': `${p.scrollbar}66`,
      'scrollbarSlider.hoverBackground': `${p.scrollbar}b3`,
      ...colorOverrides,
    },
  };
}

/** Light theme ("Ocean Blue") — colors unchanged, mirrors the light tokens. */
export const LIGHT_THEME: AppThemeDefinition<'light'> = {
  id: 'light',
  label: 'Ocean Blue',
  description: 'Clean light workspace with blue accents.',
  monaco: buildMonacoTheme({
    base: 'vs',
    background: '#ffffff',
    foreground: '#0f172a',
    gutter: '#f8fafc',
    lineHighlight: '#f8fafc',
    selection: '#dbeafe',
    inactiveSelection: '#f5f8fe',
    cursor: '#2563eb',
    lineNumber: '#5b6b80',
    lineNumberActive: '#0f172a',
    indentGuide: '#e9f0fb',
    indentGuideActive: '#d6e2f0',
    accent: '#2563eb',
    widget: '#ffffff',
    widgetBorder: '#d6e2f0',
    inputBorder: '#aebcd0',
    findMatch: '#ca8a0455',
    scrollbar: '#aebcd0',
    success: '#16a34a',
    danger: '#dc2626',
    key: '#1d4ed8',
    string: '#0f766e',
    number: '#7c3aed',
    boolean: '#b45309',
    null: '#be123c',
    punctuation: '#64748b',
  }, {
    // Exact values the light editor already used.
    'editorBracketMatch.background': '#2563eb1f',
    'editor.findMatchHighlightBackground': '#dbeafe',
    'diffEditor.insertedTextBackground': '#16a34a1f',
    'diffEditor.removedTextBackground': '#dc26261f',
    'diffEditor.insertedLineBackground': '#16a34a14',
    'diffEditor.removedLineBackground': '#dc262614',
  }),
};

export const DARK_THEMES: readonly AppThemeDefinition<DarkThemeId>[] = [
  {
    id: 'visual-studio-dark',
    label: 'Visual Studio Dark',
    description: 'The classic Dark+ palette from Visual Studio and VS Code.',
    monaco: buildMonacoTheme({
      base: 'vs-dark',
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      gutter: '#1e1e1e',
      lineHighlight: '#2a2d2e',
      selection: '#264f78',
      inactiveSelection: '#3a3d41',
      cursor: '#aeafad',
      lineNumber: '#858585',
      lineNumberActive: '#c6c6c6',
      indentGuide: '#404040',
      indentGuideActive: '#707070',
      accent: '#4da3ff',
      widget: '#252526',
      widgetBorder: '#454545',
      inputBorder: '#3c3c3c',
      findMatch: '#515c6a',
      scrollbar: '#797979',
      success: '#89d185',
      danger: '#f48771',
      key: '#9cdcfe',
      string: '#ce9178',
      number: '#b5cea8',
      boolean: '#569cd6',
      null: '#c586c0',
      punctuation: '#d4d4d4',
    }),
  },
  {
    id: 'one-dark-pro',
    label: 'One Dark Pro',
    description: "Atom's balanced One Dark palette with soft contrast.",
    monaco: buildMonacoTheme({
      base: 'vs-dark',
      background: '#282c34',
      foreground: '#abb2bf',
      gutter: '#282c34',
      lineHighlight: '#2c313c',
      selection: '#3e4451',
      inactiveSelection: '#3a3f4b',
      cursor: '#528bff',
      lineNumber: '#6b717d',
      lineNumberActive: '#abb2bf',
      indentGuide: '#3b4048',
      indentGuideActive: '#5c6370',
      accent: '#61afef',
      widget: '#21252b',
      widgetBorder: '#181a1f',
      inputBorder: '#3e4451',
      findMatch: '#42557b',
      scrollbar: '#4e5666',
      success: '#98c379',
      danger: '#e06c75',
      key: '#e5797f',
      string: '#98c379',
      number: '#d19a66',
      boolean: '#56b6c2',
      null: '#c678dd',
      punctuation: '#abb2bf',
    }),
  },
  {
    id: 'dracula',
    label: 'Dracula',
    description: 'Vivid purple, pink and cyan on a deep night background.',
    monaco: buildMonacoTheme({
      base: 'vs-dark',
      background: '#282a36',
      foreground: '#f8f8f2',
      gutter: '#282a36',
      lineHighlight: '#343746',
      selection: '#44475a',
      inactiveSelection: '#3c3f52',
      cursor: '#f8f8f0',
      lineNumber: '#6272a4',
      lineNumberActive: '#f8f8f2',
      indentGuide: '#3b3e50',
      indentGuideActive: '#6272a4',
      accent: '#bd93f9',
      widget: '#21222c',
      widgetBorder: '#191a21',
      inputBorder: '#44475a',
      findMatch: '#ffb86c55',
      scrollbar: '#6272a4',
      success: '#50fa7b',
      danger: '#ff5555',
      key: '#8be9fd',
      string: '#f1fa8c',
      number: '#bd93f9',
      boolean: '#ffb86c',
      null: '#ff79c6',
      punctuation: '#f8f8f2',
    }),
  },
  {
    id: 'jetbrains-islands-dark',
    label: 'JetBrains Islands Dark',
    description: 'Floating panels on a near-black frame, JetBrains New UI colors.',
    monaco: buildMonacoTheme({
      base: 'vs-dark',
      background: '#1e1f22',
      foreground: '#bcbec4',
      gutter: '#1e1f22',
      lineHighlight: '#26282e',
      selection: '#214283',
      inactiveSelection: '#2c3240',
      cursor: '#ced0d6',
      lineNumber: '#6f737a',
      lineNumberActive: '#a1a3ab',
      indentGuide: '#313438',
      indentGuideActive: '#4e5157',
      accent: '#6b9bf8',
      widget: '#2b2d30',
      widgetBorder: '#393b40',
      inputBorder: '#4e5157',
      findMatch: '#32593d',
      scrollbar: '#4e5157',
      success: '#5fb865',
      danger: '#f75464',
      key: '#c77dbb',
      string: '#6aab73',
      number: '#2aacb8',
      boolean: '#cf8e6d',
      null: '#56a8f5',
      punctuation: '#bcbec4',
    }),
  },
];

export const APP_THEMES: readonly AppThemeDefinition[] = [LIGHT_THEME, ...DARK_THEMES];

export const DARK_THEME_IDS: readonly DarkThemeId[] = DARK_THEMES.map((theme) => theme.id);

export function isDarkThemeId(value: unknown): value is DarkThemeId {
  return typeof value === 'string' && (DARK_THEME_IDS as readonly string[]).includes(value);
}

/** Name under which a theme is registered with Monaco. */
export function monacoThemeName(id: AppThemeId): string {
  return `json-hunt-${id}`;
}
