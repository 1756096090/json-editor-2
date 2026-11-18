/**
 * monaco-loader.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton service that lazily loads and configures the Monaco Editor runtime.
 * Ensures Monaco is loaded only once across the entire application.
 */

import { Injectable } from '@angular/core';
import { APP_THEMES, monacoThemeName } from './themes/app-themes';

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

    // Register every JSON Hunt theme (light + all dark variants) once.
    for (const theme of APP_THEMES) {
      monaco.editor.defineTheme(monacoThemeName(theme.id), theme.monaco);
    }

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
