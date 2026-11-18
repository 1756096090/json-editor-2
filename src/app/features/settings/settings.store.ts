import { Injectable, computed, effect, signal } from '@angular/core';
import {
  AppThemeId,
  DEFAULT_DARK_THEME,
  DarkThemeId,
  isDarkThemeId,
} from '../../core/themes/app-themes';
import { CASE_TRANSFORM_IDS, CaseTransform, isCaseTransform } from '../../core/case-transform';

export type ThemeMode = 'light' | 'dark';

/** 'auto' follows the browser: Spanish in Spanish-speaking countries, English elsewhere. */
export type LanguagePreference = 'auto' | 'es' | 'en';

const LANGUAGE_PREFERENCES: readonly LanguagePreference[] = ['auto', 'es', 'en'];

export interface AppSettings {
  confirmDownloads: boolean;
  confirmPanelTransfers: boolean;
  formatOnAltClick: boolean;
  formatOnBadgeClick: boolean;
  autoFixOnPasteEnabled: boolean;
  themeMode: ThemeMode;
  /** Last dark palette chosen; kept while in light mode so it comes back. */
  darkTheme: DarkThemeId;
  showOnlyDiffs: boolean;
  syncScroll: boolean;
  /** Show the "Convert case" tool when a single key or value is selected. */
  caseToolbarEnabled: boolean;
  /** Formats offered by that tool, in menu order. */
  caseFormats: CaseTransform[];
  language: LanguagePreference;
}

const SETTINGS_KEY = 'json-we-format:settings';

const DEFAULT_SETTINGS: AppSettings = {
  confirmDownloads: true,
  confirmPanelTransfers: true,
  formatOnAltClick: true,
  formatOnBadgeClick: false,
  autoFixOnPasteEnabled: true,
  themeMode: 'light',
  darkTheme: DEFAULT_DARK_THEME,
  showOnlyDiffs: false,
  syncScroll: true,
  caseToolbarEnabled: true,
  caseFormats: [...CASE_TRANSFORM_IDS],
  language: 'auto',
};

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  readonly confirmDownloads  = signal<boolean>(DEFAULT_SETTINGS.confirmDownloads);
  readonly confirmPanelTransfers = signal<boolean>(DEFAULT_SETTINGS.confirmPanelTransfers);
  readonly formatOnAltClick  = signal<boolean>(DEFAULT_SETTINGS.formatOnAltClick);
  readonly formatOnBadgeClick = signal<boolean>(DEFAULT_SETTINGS.formatOnBadgeClick);
  readonly autoFixOnPasteEnabled = signal<boolean>(DEFAULT_SETTINGS.autoFixOnPasteEnabled);
  readonly themeMode         = signal<ThemeMode>(DEFAULT_SETTINGS.themeMode);
  readonly darkTheme         = signal<DarkThemeId>(DEFAULT_SETTINGS.darkTheme);
  /** The palette actually on screen: light, or the chosen dark theme. */
  readonly activeTheme       = computed<AppThemeId>(() =>
    this.themeMode() === 'dark' ? this.darkTheme() : 'light'
  );
  readonly showOnlyDiffs     = signal<boolean>(DEFAULT_SETTINGS.showOnlyDiffs);
  readonly syncScroll        = signal<boolean>(DEFAULT_SETTINGS.syncScroll);
  readonly caseToolbarEnabled = signal<boolean>(DEFAULT_SETTINGS.caseToolbarEnabled);
  readonly caseFormats       = signal<CaseTransform[]>(DEFAULT_SETTINGS.caseFormats);
  readonly language          = signal<LanguagePreference>(DEFAULT_SETTINGS.language);

  constructor() {
    this.load();
    effect(() => { this.save(); });
    effect(() => { this.applyTheme(this.themeMode(), this.darkTheme()); });
  }

  setConfirmDownloads(v: boolean): void  { this.confirmDownloads.set(v); }
  setConfirmPanelTransfers(v: boolean): void { this.confirmPanelTransfers.set(v); }
  setFormatOnAltClick(v: boolean): void  { this.formatOnAltClick.set(v); }
  setFormatOnBadgeClick(v: boolean): void { this.formatOnBadgeClick.set(v); }
  setAutoFixOnPasteEnabled(v: boolean): void { this.autoFixOnPasteEnabled.set(v); }
  toggleAutoFixOnPasteEnabled(): void    { this.autoFixOnPasteEnabled.update((v) => !v); }
  setThemeMode(v: ThemeMode): void       { this.themeMode.set(v); }
  toggleThemeMode(): void {
    this.themeMode.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
  /** Choose a dark palette and show it right away. */
  setDarkTheme(v: DarkThemeId): void {
    this.darkTheme.set(v);
    this.themeMode.set('dark');
  }
  setShowOnlyDiffs(v: boolean): void     { this.showOnlyDiffs.set(v); }
  toggleShowOnlyDiffs(): void            { this.showOnlyDiffs.update((v) => !v); }
  setSyncScroll(v: boolean): void        { this.syncScroll.set(v); }
  toggleSyncScroll(): void               { this.syncScroll.update((v) => !v); }
  setCaseToolbarEnabled(v: boolean): void { this.caseToolbarEnabled.set(v); }
  setLanguage(v: LanguagePreference): void { this.language.set(v); }
  /** Add or remove a format, keeping the canonical menu order. */
  setCaseFormatEnabled(format: CaseTransform, enabled: boolean): void {
    this.caseFormats.update((current) =>
      CASE_TRANSFORM_IDS.filter((id) => (id === format ? enabled : current.includes(id)))
    );
  }

  reset(): void {
    this.confirmDownloads.set(DEFAULT_SETTINGS.confirmDownloads);
    this.confirmPanelTransfers.set(DEFAULT_SETTINGS.confirmPanelTransfers);
    this.formatOnAltClick.set(DEFAULT_SETTINGS.formatOnAltClick);
    this.formatOnBadgeClick.set(DEFAULT_SETTINGS.formatOnBadgeClick);
    this.autoFixOnPasteEnabled.set(DEFAULT_SETTINGS.autoFixOnPasteEnabled);
    this.themeMode.set(DEFAULT_SETTINGS.themeMode);
    this.darkTheme.set(DEFAULT_SETTINGS.darkTheme);
    this.showOnlyDiffs.set(DEFAULT_SETTINGS.showOnlyDiffs);
    this.syncScroll.set(DEFAULT_SETTINGS.syncScroll);
    this.caseToolbarEnabled.set(DEFAULT_SETTINGS.caseToolbarEnabled);
    this.caseFormats.set(DEFAULT_SETTINGS.caseFormats);
    this.language.set(DEFAULT_SETTINGS.language);
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      const data: AppSettings = {
        confirmDownloads:  this.confirmDownloads(),
        confirmPanelTransfers: this.confirmPanelTransfers(),
        formatOnAltClick:  this.formatOnAltClick(),
        formatOnBadgeClick: this.formatOnBadgeClick(),
        autoFixOnPasteEnabled: this.autoFixOnPasteEnabled(),
        themeMode:         this.themeMode(),
        darkTheme:         this.darkTheme(),
        showOnlyDiffs:     this.showOnlyDiffs(),
        syncScroll:        this.syncScroll(),
        caseToolbarEnabled: this.caseToolbarEnabled(),
        caseFormats:       this.caseFormats(),
        language:          this.language(),
      };
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<AppSettings>;
      if (typeof p.confirmDownloads  === 'boolean') this.confirmDownloads.set(p.confirmDownloads);
      if (typeof p.confirmPanelTransfers === 'boolean') this.confirmPanelTransfers.set(p.confirmPanelTransfers);
      if (typeof p.formatOnAltClick  === 'boolean') this.formatOnAltClick.set(p.formatOnAltClick);
      if (typeof p.formatOnBadgeClick === 'boolean') this.formatOnBadgeClick.set(p.formatOnBadgeClick);
      if (typeof p.autoFixOnPasteEnabled === 'boolean') this.autoFixOnPasteEnabled.set(p.autoFixOnPasteEnabled);
      if (p.themeMode === 'light' || p.themeMode === 'dark') this.themeMode.set(p.themeMode);
      if (isDarkThemeId(p.darkTheme)) this.darkTheme.set(p.darkTheme);
      if (typeof p.showOnlyDiffs === 'boolean') this.showOnlyDiffs.set(p.showOnlyDiffs);
      if (typeof p.syncScroll    === 'boolean') this.syncScroll.set(p.syncScroll);
      if (typeof p.caseToolbarEnabled === 'boolean') this.caseToolbarEnabled.set(p.caseToolbarEnabled);
      if (Array.isArray(p.caseFormats)) {
        const saved = p.caseFormats.filter(isCaseTransform);
        this.caseFormats.set(CASE_TRANSFORM_IDS.filter((id) => saved.includes(id)));
      }
      if (LANGUAGE_PREFERENCES.includes(p.language as LanguagePreference)) {
        this.language.set(p.language as LanguagePreference);
      }
    } catch { /* ignore */ }
  }

  /** Mirrors the pre-boot script in index.html: same attributes, so no flash on load. */
  private applyTheme(mode: ThemeMode, darkTheme: DarkThemeId): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-dark-theme', darkTheme);
  }
}
