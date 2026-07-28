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
        { token: 'string.key.json', foreground: '79b8e8', fontStyle: '' },
        { token: 'string.value.json', foreground: 'a8c97f', fontStyle: '' },
        { token: 'number.json', foreground: 'c0a5df' },
        { token: 'number', foreground: 'c0a5df' },
        { token: 'keyword.json', foreground: 'dca16d' },
        { token: 'keyword', foreground: 'dca16d' },
        { token: 'keyword.null', foreground: 'df7f87', fontStyle: 'italic' },
        { token: 'delimiter.bracket.json', foreground: '9ba8b8' },
        { token: 'delimiter.array.json', foreground: '9ba8b8' },
        { token: 'delimiter.colon.json', foreground: '9ba8b8' },
        { token: 'delimiter.comma.json', foreground: '9ba8b8' },
      ],
      colors: {
        'editor.background': '#18212e',
        'editor.foreground': '#e6edf5',
        'editor.lineHighlightBackground': '#1d2735',
        'editor.lineHighlightBorder': '#00000000',
        'editor.selectionBackground': '#26405f',
        'editorCursor.foreground': '#5794f7',
        'editorGutter.background': '#141c27',
        'editorLineNumber.foreground': '#748196',
        'editorLineNumber.activeForeground': '#e6edf5',
        'editorIndentGuide.background': '#2a3545',
        'editorIndentGuide.activeBackground': '#3b4a5e',
        'editorBracketMatch.background': '#5794f726',
        'editorBracketMatch.border': '#5794f7',
        'editor.findMatchBackground': '#d9a44155',
        'editor.findMatchHighlightBackground': '#5794f733',
        'editorOverviewRuler.border': '#00000000',
        'editorWidget.background': '#1c2634',
        'editorWidget.border': '#2a3545',
        'input.background': '#18212e',
        'input.foreground': '#e6edf5',
        'input.border': '#3b4a5e',
        'diffEditor.insertedTextBackground': '#4ac07a26',
        'diffEditor.removedTextBackground': '#e5707a26',
        'diffEditor.insertedLineBackground': '#4ac07a1f',
        'diffEditor.removedLineBackground': '#e5707a1f',
        'scrollbarSlider.background': '#3b4a5e66',
        'scrollbarSlider.hoverBackground': '#3b4a5eb3',
      },
    });

    // Register a custom light theme matching JSON Hunt design tokens.
    monaco.editor.defineTheme('json-we-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '0969a8' },
        { token: 'string.value.json', foreground: '9a4d12' },
        { token: 'number.json', foreground: '6f42c1' },
        { token: 'number', foreground: '6f42c1' },
        { token: 'keyword.json', foreground: 'a62d68' },
        { token: 'keyword', foreground: 'a62d68' },
        { token: 'keyword.null', foreground: 'cf222e', fontStyle: 'italic' },
        { token: 'delimiter.bracket.json', foreground: '64748b' },
        { token: 'delimiter.array.json', foreground: '64748b' },
        { token: 'delimiter.colon.json', foreground: '64748b' },
        { token: 'delimiter.comma.json', foreground: '64748b' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#172033',
        'editor.lineHighlightBackground': '#f6f8fa',
        'editor.lineHighlightBorder': '#00000000',
        'editor.selectionBackground': '#d6e6ff',
        'editorCursor.foreground': '#2563d9',
        'editorGutter.background': '#f1f4f8',
        'editorLineNumber.foreground': '#7a8799',
        'editorLineNumber.activeForeground': '#172033',
        'editorIndentGuide.background': '#e4e9f0',
        'editorIndentGuide.activeBackground': '#d8dee7',
        'editorBracketMatch.background': '#2563d91f',
        'editorBracketMatch.border': '#2563d9',
        'editor.findMatchBackground': '#9a620055',
        'editor.findMatchHighlightBackground': '#d6e6ff',
        'editorOverviewRuler.border': '#00000000',
        'editorWidget.background': '#ffffff',
        'editorWidget.border': '#d8dee7',
        'input.background': '#ffffff',
        'input.foreground': '#172033',
        'input.border': '#b8c2cf',
        'diffEditor.insertedTextBackground': '#197f431f',
        'diffEditor.removedTextBackground': '#c9333d1f',
        'diffEditor.insertedLineBackground': '#197f4317',
        'diffEditor.removedLineBackground': '#c9333d17',
        'scrollbarSlider.background': '#b8c2cf66',
        'scrollbarSlider.hoverBackground': '#b8c2cfb3',
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
