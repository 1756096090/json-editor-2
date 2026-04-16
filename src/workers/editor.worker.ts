/// <reference lib="webworker" />

/**
 * Bundled Monaco editor worker.
 * esbuild resolves all transitive imports at build time into a single
 * self-contained file — no runtime asset-copy issues.
 */
import 'monaco-editor/esm/vs/editor/editor.worker.js';
