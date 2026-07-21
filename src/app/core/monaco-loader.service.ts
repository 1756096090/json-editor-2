/**
 * monaco-loader.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton service that lazily loads and configures the Monaco Editor runtime.
 * Ensures Monaco is loaded only once across the entire application.
 */

import { Injectable } from '@angular/core';

/** Re-export the monaco namespace type for convenience. */
export type MonacoNamespace = typeof import('monaco-editor');

@Injectable({ providedIn: 'root' })
export class MonacoLoaderService {
  private loadPromise: Promise<MonacoNamespace> | null = null;

  /**
   * Loads Monaco Editor and returns the `monaco` namespace.
   * Subsequent calls return the same promise (idempotent).
   */
  load(): Promise<MonacoNamespace> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.initMonaco();
    return this.loadPromise;
  }

  private async initMonaco(): Promise<MonacoNamespace> {
    // MonacoEnvironment MUST be set BEFORE the import so Monaco picks it up on init.
    // Use `new URL(path, import.meta.url)` so Angular/esbuild bundles the worker
    // files (and ALL their transitive imports) at build time into self-contained
    // chunks. This avoids runtime 404s from the shallow *.worker.js asset copy.
    (self as unknown as Record<string, unknown>)['MonacoEnvironment'] = {
      getWorker(_moduleId: string, label: string): Worker {
        if (label === 'json') {
          return new Worker(
            new URL('../../workers/json.worker', import.meta.url),
            { type: 'module' }
          );
        }
        return new Worker(
          new URL('../../workers/editor.worker', import.meta.url),
          { type: 'module' }
        );
      },
    };

    const monaco = await import('monaco-editor');

    // Register a custom dark theme matching JSON Hunt design tokens.
    monaco.editor.defineTheme('json-we-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '7db9e8', fontStyle: '' },
        { token: 'string.value.json', foreground: 'a6c97a', fontStyle: '' },
        { token: 'number.json', foreground: 'c3a6df' },
        { token: 'number', foreground: 'c3a6df' },
        { token: 'keyword.json', foreground: 'dda66f' },
        { token: 'keyword', foreground: 'dda66f' },
        { token: 'keyword.null', foreground: 'df858b', fontStyle: 'italic' },
        { token: 'delimiter.bracket.json', foreground: 'd2b96f' },
        { token: 'delimiter.array.json', foreground: 'd2b96f' },
        { token: 'delimiter.colon.json', foreground: 'a8b3c2' },
        { token: 'delimiter.comma.json', foreground: 'a8b3c2' },
      ],
      colors: {
        'editor.background': '#131a24',
        'editor.foreground': '#e5eaf2',
        'editor.lineHighlightBackground': '#0f1823',
        'editor.selectionBackground': '#1d3560',
        'editorCursor.foreground': '#4a89ff',
        'editorGutter.background': '#131a24',
        'editorLineNumber.foreground': '#5e6e83',
        'editorLineNumber.activeForeground': '#7db9e8',
        'editorBracketMatch.background': '#4a89ff22',
        'editorBracketMatch.border': '#4a89ff',
        'editor.findMatchBackground': '#deb35f44',
        'editor.findMatchHighlightBackground': '#4a89ff22',
        'editorWidget.background': '#1b2432',
        'editorWidget.border': '#37465d',
        'input.background': '#131a24',
        'input.foreground': '#e5eaf2',
        'input.border': '#37465d',
        'diffEditor.insertedTextBackground': '#56c99026',
        'diffEditor.removedTextBackground': '#e9707826',
        'diffEditor.insertedLineBackground': '#56c9901e',
        'diffEditor.removedLineBackground': '#e970781e',
        'scrollbarSlider.background': '#37465d55',
        'scrollbarSlider.hoverBackground': '#37465d99',
      },
    });

    // Register a custom light theme matching JSON Hunt design tokens.
    monaco.editor.defineTheme('json-we-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '0ea5e9' },
        { token: 'string.value.json', foreground: 'c2410c' },
        { token: 'number.json', foreground: '7c3aed' },
        { token: 'number', foreground: '7c3aed' },
        { token: 'keyword.json', foreground: 'be185d' },
        { token: 'keyword', foreground: 'be185d' },
        { token: 'keyword.null', foreground: 'dc2626', fontStyle: 'italic' },
        { token: 'delimiter.bracket.json', foreground: '64748b' },
        { token: 'delimiter.array.json', foreground: '64748b' },
        { token: 'delimiter.colon.json', foreground: '64748b' },
        { token: 'delimiter.comma.json', foreground: '64748b' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#0f172a',
        'editor.lineHighlightBackground': '#f8fafc',
        'editor.selectionBackground': '#dbeafe',
        'editorCursor.foreground': '#2563eb',
        'editorGutter.background': '#ffffff',
        'editorLineNumber.foreground': '#64748b',
        'editorLineNumber.activeForeground': '#2563eb',
        'editorBracketMatch.background': '#2563eb1f',
        'editorBracketMatch.border': '#2563eb',
        'editor.findMatchBackground': '#f59e0b55',
        'editor.findMatchHighlightBackground': '#dbeafe',
        'editorWidget.background': '#ffffff',
        'editorWidget.border': '#64748b',
        'input.background': '#ffffff',
        'input.foreground': '#0f172a',
        'input.border': '#64748b',
        'diffEditor.insertedTextBackground': '#15803d1f',
        'diffEditor.removedTextBackground': '#dc26261f',
        'diffEditor.insertedLineBackground': '#15803d17',
        'diffEditor.removedLineBackground': '#dc262617',
        'scrollbarSlider.background': '#64748b66',
        'scrollbarSlider.hoverBackground': '#64748bb3',
      },
    });

    // Configure JSON language defaults
    const jsonLang = monaco.languages.json as Record<string, unknown>;
    if (jsonLang && typeof jsonLang['jsonDefaults'] === 'object' && jsonLang['jsonDefaults'] !== null) {
      (jsonLang['jsonDefaults'] as { setDiagnosticsOptions: (opts: unknown) => void }).setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        trailingCommas: 'error',
      });
    }

    return monaco;
  }
}
