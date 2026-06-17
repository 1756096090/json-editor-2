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
        { token: 'string.key.json', foreground: '7dd3fc', fontStyle: '' },
        { token: 'string.value.json', foreground: 'fdba74', fontStyle: '' },
        { token: 'number.json', foreground: 'c4b5fd' },
        { token: 'number', foreground: 'c4b5fd' },
        { token: 'keyword.json', foreground: 'f9a8d4' },
        { token: 'keyword', foreground: 'f9a8d4' },
        { token: 'keyword.null', foreground: 'f87171', fontStyle: 'italic' },
        { token: 'delimiter.bracket.json', foreground: '9aa4b2' },
        { token: 'delimiter.array.json', foreground: '9aa4b2' },
        { token: 'delimiter.colon.json', foreground: '9aa4b2' },
        { token: 'delimiter.comma.json', foreground: '9aa4b2' },
      ],
      colors: {
        'editor.background': '#1b2230',
        'editor.foreground': '#e6edf3',
        'editor.lineHighlightBackground': '#141c28',
        'editor.selectionBackground': '#1e3a5f',
        'editorCursor.foreground': '#60a5fa',
        'editorGutter.background': '#1b2230',
        'editorLineNumber.foreground': '#9aa4b2',
        'editorLineNumber.activeForeground': '#60a5fa',
        'editorBracketMatch.background': '#3b82f633',
        'editorBracketMatch.border': '#60a5fa',
        'editor.findMatchBackground': '#f59e0b55',
        'editor.findMatchHighlightBackground': '#3b82f633',
        'editorWidget.background': '#151a21',
        'editorWidget.border': '#5b6b80',
        'input.background': '#1b2230',
        'input.foreground': '#e6edf3',
        'input.border': '#5b6b80',
        'diffEditor.insertedTextBackground': '#22c55e26',
        'diffEditor.removedTextBackground': '#ef444426',
        'diffEditor.insertedLineBackground': '#22c55e1f',
        'diffEditor.removedLineBackground': '#ef44441f',
        'scrollbarSlider.background': '#5b6b8066',
        'scrollbarSlider.hoverBackground': '#5b6b80b3',
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
