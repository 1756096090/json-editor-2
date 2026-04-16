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

    // Register a custom dark theme matching VS Code Dark+
    monaco.editor.defineTheme('json-we-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        // JSON keys
        { token: 'string.key.json', foreground: '9cdcfe', fontStyle: '' },
        // JSON string values
        { token: 'string.value.json', foreground: 'ce9178', fontStyle: '' },
        // Numbers
        { token: 'number.json', foreground: 'b5cea8' },
        { token: 'number', foreground: 'b5cea8' },
        // Booleans / keywords
        { token: 'keyword.json', foreground: '569cd6' },
        { token: 'keyword', foreground: '569cd6' },
        // Null
        { token: 'keyword.null', foreground: '858585', fontStyle: 'italic' },
        // Brackets / delimiters
        { token: 'delimiter.bracket.json', foreground: 'ffd700' },
        { token: 'delimiter.array.json', foreground: 'da70d6' },
        { token: 'delimiter.colon.json', foreground: 'd4d4d4' },
        { token: 'delimiter.comma.json', foreground: 'd4d4d4' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#aeafad',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#888888',
        'editor.findMatchBackground': '#515c6a',
        'editor.findMatchHighlightBackground': '#ea5c0055',
        'editorWidget.background': '#252526',
        'editorWidget.border': '#454545',
        'input.background': '#3c3c3c',
        'input.foreground': '#cccccc',
        'input.border': '#3c3c3c',
        'diffEditor.insertedTextBackground': '#9bb95533',
        'diffEditor.removedTextBackground': '#ff000033',
        'diffEditor.insertedLineBackground': '#9bb95520',
        'diffEditor.removedLineBackground': '#ff000020',
        'scrollbarSlider.background': '#79797966',
        'scrollbarSlider.hoverBackground': '#646464b3',
      },
    });

    // Register a custom light theme matching VS Code Light+
    monaco.editor.defineTheme('json-we-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '0451a5' },
        { token: 'string.value.json', foreground: 'a31515' },
        { token: 'number.json', foreground: '098658' },
        { token: 'number', foreground: '098658' },
        { token: 'keyword.json', foreground: '0000ff' },
        { token: 'keyword', foreground: '0000ff' },
        { token: 'keyword.null', foreground: '6e7681', fontStyle: 'italic' },
        { token: 'delimiter.bracket.json', foreground: '0431fa' },
        { token: 'delimiter.array.json', foreground: '0431fa' },
        { token: 'delimiter.colon.json', foreground: '1e1e1e' },
        { token: 'delimiter.comma.json', foreground: '1e1e1e' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1e1e1e',
        'editor.lineHighlightBackground': '#f0f0f0',
        'editor.selectionBackground': '#add6ff',
        'editorCursor.foreground': '#000000',
        'editorLineNumber.foreground': '#6e7681',
        'editorLineNumber.activeForeground': '#1e1e1e',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#b9b9b9',
        'editor.findMatchBackground': '#a8ac94',
        'editor.findMatchHighlightBackground': '#ea5c0055',
        'editorWidget.background': '#f3f3f3',
        'editorWidget.border': '#c8c8c8',
        'input.background': '#ffffff',
        'input.foreground': '#1e1e1e',
        'input.border': '#cecece',
        'diffEditor.insertedTextBackground': '#9bb95533',
        'diffEditor.removedTextBackground': '#ff000033',
        'diffEditor.insertedLineBackground': '#9bb95520',
        'diffEditor.removedLineBackground': '#ff000020',
        'scrollbarSlider.background': '#64646466',
        'scrollbarSlider.hoverBackground': '#646464b3',
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
