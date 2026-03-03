import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
  confirmDownloads: boolean;
  formatOnAltClick: boolean;
  formatOnBadgeClick: boolean;
  autoFixOnPasteEnabled: boolean;
  themeMode: ThemeMode;
  showOnlyDiffs: boolean;
  syncScroll: boolean;
}

const SETTINGS_KEY = 'json-we-format:settings';

const DEFAULT_SETTINGS: AppSettings = {
  confirmDownloads: true,
  formatOnAltClick: true,
  formatOnBadgeClick: false,
  autoFixOnPasteEnabled: true,
  themeMode: 'dark',
  showOnlyDiffs: false,
  syncScroll: true
};

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  readonly confirmDownloads  = signal<boolean>(DEFAULT_SETTINGS.confirmDownloads);
  readonly formatOnAltClick  = signal<boolean>(DEFAULT_SETTINGS.formatOnAltClick);
  readonly formatOnBadgeClick = signal<boolean>(DEFAULT_SETTINGS.formatOnBadgeClick);
  readonly autoFixOnPasteEnabled = signal<boolean>(DEFAULT_SETTINGS.autoFixOnPasteEnabled);
  readonly themeMode         = signal<ThemeMode>(DEFAULT_SETTINGS.themeMode);
  readonly showOnlyDiffs     = signal<boolean>(DEFAULT_SETTINGS.showOnlyDiffs);
  readonly syncScroll        = signal<boolean>(DEFAULT_SETTINGS.syncScroll);

  constructor() {
    this.load();
    effect(() => { this.save(); });
    effect(() => { this.applyTheme(this.themeMode()); });
  }

  setConfirmDownloads(v: boolean): void  { this.confirmDownloads.set(v); }
  setFormatOnAltClick(v: boolean): void  { this.formatOnAltClick.set(v); }
  setFormatOnBadgeClick(v: boolean): void { this.formatOnBadgeClick.set(v); }
  setAutoFixOnPasteEnabled(v: boolean): void { this.autoFixOnPasteEnabled.set(v); }
  toggleAutoFixOnPasteEnabled(): void    { this.autoFixOnPasteEnabled.update((v) => !v); }
  setThemeMode(v: ThemeMode): void       { this.themeMode.set(v); }
  toggleThemeMode(): void {
    this.themeMode.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
  setShowOnlyDiffs(v: boolean): void     { this.showOnlyDiffs.set(v); }
  toggleShowOnlyDiffs(): void            { this.showOnlyDiffs.update((v) => !v); }
  setSyncScroll(v: boolean): void        { this.syncScroll.set(v); }
  toggleSyncScroll(): void               { this.syncScroll.update((v) => !v); }

  reset(): void {
    this.confirmDownloads.set(DEFAULT_SETTINGS.confirmDownloads);
    this.formatOnAltClick.set(DEFAULT_SETTINGS.formatOnAltClick);
    this.formatOnBadgeClick.set(DEFAULT_SETTINGS.formatOnBadgeClick);
    this.autoFixOnPasteEnabled.set(DEFAULT_SETTINGS.autoFixOnPasteEnabled);
    this.themeMode.set(DEFAULT_SETTINGS.themeMode);
    this.showOnlyDiffs.set(DEFAULT_SETTINGS.showOnlyDiffs);
    this.syncScroll.set(DEFAULT_SETTINGS.syncScroll);
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      const data: AppSettings = {
        confirmDownloads:  this.confirmDownloads(),
        formatOnAltClick:  this.formatOnAltClick(),
        formatOnBadgeClick: this.formatOnBadgeClick(),
        autoFixOnPasteEnabled: this.autoFixOnPasteEnabled(),
        themeMode:         this.themeMode(),
        showOnlyDiffs:     this.showOnlyDiffs(),
        syncScroll:        this.syncScroll()
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
      if (typeof p.formatOnAltClick  === 'boolean') this.formatOnAltClick.set(p.formatOnAltClick);
      if (typeof p.formatOnBadgeClick === 'boolean') this.formatOnBadgeClick.set(p.formatOnBadgeClick);
      if (typeof p.autoFixOnPasteEnabled === 'boolean') this.autoFixOnPasteEnabled.set(p.autoFixOnPasteEnabled);
      if (p.themeMode === 'light' || p.themeMode === 'dark') this.themeMode.set(p.themeMode);
      if (typeof p.showOnlyDiffs === 'boolean') this.showOnlyDiffs.set(p.showOnlyDiffs);
      if (typeof p.syncScroll    === 'boolean') this.syncScroll.set(p.syncScroll);
    } catch { /* ignore */ }
  }

  private applyTheme(theme: ThemeMode): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }
}
