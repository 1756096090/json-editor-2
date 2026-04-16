/// <reference lib="webworker" />

/**
 * Bundled Monaco JSON language worker.
 * esbuild resolves all transitive imports at build time into a single
 * self-contained file — no runtime asset-copy issues.
 */
import 'monaco-editor/esm/vs/language/json/json.worker.js';
