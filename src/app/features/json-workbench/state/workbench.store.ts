import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { findMismatchedBracketIndexes } from '../utils/bracket-utils';
import { SettingsStore, type ThemeMode } from '../../settings/settings.store';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export type PreviewMode = 'tree' | 'table' | 'text';
export type LeftPanelMode = 'text' | 'tree' | 'table';
// Re-export so existing imports from workbench.store still work
export type { ThemeMode } from '../../settings/settings.store';
export type DiffViewMode = 'text' | 'tree' | 'table';

type ParseState =
  | {
      ok: true;
      value: JsonValue;
    }
  | {
      ok: false;
      error: string;
    };

const DEFAULT_JSON = '{\n  "name": "json-we-format-angular",\n  "version": 1\n}';
const DRAFT_STORAGE_KEY     = 'json-we-format:draft';
const BASELINE_STORAGE_KEY  = 'json-we-format:baseline';
const SHOW_DIFF_STORAGE_KEY = 'json-we-format:show-diff';
const DIFF_VIEW_MODE_KEY    = 'json-we-format:diff-view-mode';

@Injectable({
  providedIn: 'root'
})
export class WorkbenchStore {
  private readonly settingsStore = inject(SettingsStore);

  readonly rawText = signal<string>(DEFAULT_JSON);
  readonly leftMode = signal<LeftPanelMode>('text');
  readonly rightMode = signal<LeftPanelMode>('text');
  readonly previewMode = signal<PreviewMode>('tree');
  readonly statusMessage = signal<string>('');
  readonly showDiff = signal<boolean>(false);
  readonly diffViewMode = signal<DiffViewMode>('text');

  // Delegated to SettingsStore
  readonly themeMode    = this.settingsStore.themeMode;
  readonly syncScroll   = this.settingsStore.syncScroll;
  readonly showOnlyDiffs = this.settingsStore.showOnlyDiffs;

  readonly baselineText = signal<string>(DEFAULT_JSON);

  private readonly lastValidJsonWritable = signal<JsonValue | null>(null);

  private readonly parseResult = computed<ParseState>(() => parseJson(this.rawText()));

  readonly isValidJson = computed<boolean>(() => this.parseResult().ok);
  readonly parseErrorMessage = computed<string>(() => {
    const parsed = this.parseResult();
    return parsed.ok ? '' : parsed.error;
  });

  readonly currentJson = computed<JsonValue | null>(() => {
    const parsed = this.parseResult();
    return parsed.ok ? parsed.value : null;
  });

  readonly lastValidJson = this.lastValidJsonWritable.asReadonly();

  readonly workingJson = computed<JsonValue | null>(() => this.currentJson() ?? this.lastValidJson());

  readonly workingPrettyText = computed<string>(() => {
    const json = this.workingJson();
    return json === null ? '' : stringifyJson(json, 2);
  });

  readonly workingMinifiedText = computed<string>(() => {
    const json = this.workingJson();
    return json === null ? '' : stringifyJson(json, 0);
  });

  readonly baselineExists = computed<boolean>(() => this.baselineText().length > 0);

  readonly mismatchedBracketIndexes = computed<number[]>(() =>
    findMismatchedBracketIndexes(this.rawText())
  );

  readonly mismatchCount = computed<number>(() => this.mismatchedBracketIndexes().length);

  readonly baselineJson = computed<JsonValue | null>(() => {
    const parsed = parseJson(this.baselineText());
    return parsed.ok ? parsed.value : null;
  });

  constructor() {
    this.restoreStateFromStorage();

    effect(
      () => {
        const parsed = this.parseResult();
        if (parsed.ok) {
          this.lastValidJsonWritable.set(parsed.value);
        }
      },
      { allowSignalWrites: true }
    );

    effect(() => {
      this.saveStorage(DRAFT_STORAGE_KEY, this.rawText());
    });

    effect(() => {
      this.saveStorage(BASELINE_STORAGE_KEY, this.baselineText());
    });

    effect(() => {
      this.saveStorage(SHOW_DIFF_STORAGE_KEY, this.showDiff() ? '1' : '');
    });

    effect(() => {
      this.saveStorage(DIFF_VIEW_MODE_KEY, this.diffViewMode());
    });
  }

  setRawText(nextRawText: string): void {
    this.rawText.set(nextRawText);
  }

  setBaselineText(text: string): void {
    this.baselineText.set(text);
  }

  setLeftMode(mode: LeftPanelMode): void {
    this.leftMode.set(mode);
  }

  setRightMode(mode: LeftPanelMode): void {
    this.rightMode.set(mode);
  }

  setPreviewMode(mode: PreviewMode): void {
    this.previewMode.set(mode);
  }

  setTheme(mode: ThemeMode): void {
    this.settingsStore.setThemeMode(mode);
  }

  toggleTheme(): void {
    this.settingsStore.toggleThemeMode();
  }

  toggleDiff(): void {
    this.showDiff.update((v) => !v);
  }

  setDiffViewMode(mode: DiffViewMode): void {
    this.diffViewMode.set(mode);
  }

  toggleSyncScroll(): void {
    this.settingsStore.toggleSyncScroll();
  }

  toggleShowOnlyDiffs(): void {
    this.settingsStore.toggleShowOnlyDiffs();
  }

  formatJson(): boolean {
    const parsed = this.parseResult();
    if (!parsed.ok) {
      return false;
    }

    this.rawText.set(stringifyJson(parsed.value, 2));
    return true;
  }

  minifyJson(): boolean {
    const parsed = this.parseResult();
    if (!parsed.ok) {
      return false;
    }

    this.rawText.set(stringifyJson(parsed.value, 0));
    return true;
  }

  setBaselineFromWorking(): boolean {
    const json = this.workingJson();
    if (json === null) {
      return false;
    }

    this.baselineText.set(stringifyJson(json, 2));
    return true;
  }

  resetToBaseline(): boolean {
    const baseline = this.baselineText();
    if (!baseline) {
      return false;
    }

    this.rawText.set(baseline);
    return true;
  }

  clearStatusMessage(): void {
    this.statusMessage.set('');
  }

  setStatusMessage(message: string): void {
    this.statusMessage.set(message);
  }

  private restoreStateFromStorage(): void {
    const draft = this.readStorage(DRAFT_STORAGE_KEY);
    if (draft) {
      this.rawText.set(draft);
    }

    const baseline = this.readStorage(BASELINE_STORAGE_KEY);
    if (baseline) {
      const parsedBaseline = parseJson(baseline);
      if (parsedBaseline.ok) {
        this.baselineText.set(stringifyJson(parsedBaseline.value, 2));
      }
    }

    const showDiff = this.readStorage(SHOW_DIFF_STORAGE_KEY);
    if (showDiff === '1') {
      this.showDiff.set(true);
    }

    const diffViewMode = this.readStorage(DIFF_VIEW_MODE_KEY);
    if (diffViewMode === 'text' || diffViewMode === 'tree' || diffViewMode === 'table') {
      this.diffViewMode.set(diffViewMode);
    }

  }

  private saveStorage(key: string, value: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (!value) {
        window.localStorage.removeItem(key);
        return;
      }

      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage write errors.
    }
  }

  private readStorage(key: string): string {
    if (typeof window === 'undefined') {
      return '';
    }

    try {
      return window.localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  }

}

function parseJson(source: string): ParseState {
  try {
    return {
      ok: true,
      value: JSON.parse(source) as JsonValue
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to parse JSON.'
    };
  }
}

function stringifyJson(value: JsonValue, spaces: number): string {
  return JSON.stringify(value, null, spaces);
}
