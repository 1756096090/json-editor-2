import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SettingsStore } from '../../settings/settings.store';
import { getJsonError, type JsonErrorPosition } from '../../../core/json-error.utils';
import { StorageService } from '../../../core/storage.service';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export type LeftPanelMode = 'text' | 'tree' | 'table' | 'yaml' | 'csv' | 'xml';
// Re-export so existing imports from workbench.store still work
export type { ThemeMode } from '../../settings/settings.store';
export type ActivePanel = 'left' | 'right';

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

@Injectable({
  providedIn: 'root'
})
export class WorkbenchStore {
  private readonly settingsStore = inject(SettingsStore);
  private readonly storage = inject(StorageService);

  readonly rawText = signal<string>(DEFAULT_JSON);
  readonly leftMode = signal<LeftPanelMode>('text');
  readonly rightMode = signal<LeftPanelMode>('text');
  readonly statusMessage = signal<string>('');
  readonly showDiff = signal<boolean>(false);
  readonly activePanel = signal<ActivePanel>('left');

  // Delegated to SettingsStore
  readonly themeMode = this.settingsStore.themeMode;

  readonly baselineText = signal<string>(DEFAULT_JSON);

  private readonly lastValidJsonWritable = signal<JsonValue | null>(null);

  /** Last valid left text (for revert in autofix failure). */
  readonly lastValidLeftText = signal<string>(DEFAULT_JSON);
  /** Last valid right text (for revert in autofix failure). */
  readonly lastValidRightText = signal<string>(DEFAULT_JSON);

  private readonly parseResult = computed<ParseState>(() => parseJson(this.rawText()));
  private readonly baselineParseResult = computed<ParseState>(() => parseJson(this.baselineText()));

  // ── Left panel parse state ─────────────────────────────
  readonly isValidJson = computed<boolean>(() => this.parseResult().ok);
  readonly parseErrorMessage = computed<string>(() => {
    const parsed = this.parseResult();
    return parsed.ok ? '' : parsed.error;
  });
  readonly leftError = computed<JsonErrorPosition | null>(() => {
    const text = this.rawText().trim();
    return text.length === 0 ? null : getJsonError(this.rawText());
  });

  // ── Right panel parse state ─────────────────────────────
  readonly isBaselineValid = computed<boolean>(() => this.baselineParseResult().ok);
  readonly baselineParseErrorMessage = computed<string>(() => {
    const parsed = this.baselineParseResult();
    return parsed.ok ? '' : parsed.error;
  });
  readonly rightError = computed<JsonErrorPosition | null>(() => {
    const text = this.baselineText().trim();
    return text.length === 0 ? null : getJsonError(this.baselineText());
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

  readonly baselineJson = computed<JsonValue | null>(() => {
    const parsed = parseJson(this.baselineText());
    return parsed.ok ? parsed.value : null;
  });

  constructor() {
    this.restoreStateFromStorage();

    effect(() => {
        const parsed = this.parseResult();
        if (parsed.ok) {
          this.lastValidJsonWritable.set(parsed.value);
          this.lastValidLeftText.set(this.rawText());
        }
      }
    );

    effect(() => {
        const parsed = this.baselineParseResult();
        if (parsed.ok) {
          this.lastValidRightText.set(this.baselineText());
        }
      }
    );

    effect(() => { this.storage.write(DRAFT_STORAGE_KEY,     this.rawText()); });
    effect(() => { this.storage.write(BASELINE_STORAGE_KEY,  this.baselineText()); });
    effect(() => { this.storage.write(SHOW_DIFF_STORAGE_KEY, this.showDiff() ? '1' : ''); });
  }

  setRawText(nextRawText: string): void {
    this.rawText.set(nextRawText);
  }

  setBaselineText(text: string): void {
    this.baselineText.set(text);
  }

  setActivePanel(panel: ActivePanel): void {
    this.activePanel.set(panel);
  }

  setLeftMode(mode: LeftPanelMode): void {
    this.leftMode.set(mode);
  }

  setRightMode(mode: LeftPanelMode): void {
    this.rightMode.set(mode);
  }

  toggleDiff(): void {
    this.showDiff.update((v) => !v);
  }

  formatJson():         boolean { return this.applyTransform(this.parseResult(),         (v) => this.rawText.set(v),      2); }
  minifyJson():         boolean { return this.applyTransform(this.parseResult(),         (v) => this.rawText.set(v),      0); }
  formatBaselineJson(): boolean { return this.applyTransform(this.baselineParseResult(), (v) => this.baselineText.set(v), 2); }
  minifyBaselineJson(): boolean { return this.applyTransform(this.baselineParseResult(), (v) => this.baselineText.set(v), 0); }

  private applyTransform(result: ParseState, setter: (v: string) => void, spaces: number): boolean {
    if (!result.ok) return false;
    setter(stringifyJson(result.value, spaces));
    return true;
  }

  /** Format JSON in the active panel. */
  formatActivePanel(): boolean {
    return this.activePanel() === 'left' ? this.formatJson() : this.formatBaselineJson();
  }

  /** Minify JSON in the active panel. */
  minifyActivePanel(): boolean {
    return this.activePanel() === 'left' ? this.minifyJson() : this.minifyBaselineJson();
  }

  resetToBaseline(): boolean {
    const baseline = this.baselineText();
    if (!baseline) {
      return false;
    }

    this.rawText.set(baseline);
    return true;
  }

  setStatusMessage(message: string): void {
    this.statusMessage.set(message);
  }

  private restoreStateFromStorage(): void {
    const draft = this.storage.read(DRAFT_STORAGE_KEY);
    if (draft) this.rawText.set(draft);

    const baseline = this.storage.read(BASELINE_STORAGE_KEY);
    if (baseline) {
      const parsed = parseJson(baseline);
      if (parsed.ok) this.baselineText.set(stringifyJson(parsed.value, 2));
    }

    if (this.storage.read(SHOW_DIFF_STORAGE_KEY) === '1') this.showDiff.set(true);
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
