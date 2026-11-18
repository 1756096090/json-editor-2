import { TestBed } from '@angular/core/testing';
import { SettingsStore } from './settings.store';
import { useMemoryStorage } from '../../testing/memory-storage';

const SETTINGS_KEY = 'json-we-format:settings';

function createStore(): SettingsStore {
  const store = TestBed.inject(SettingsStore);
  TestBed.tick(); // run the save/apply effects
  return store;
}

/** Simulates a page reload: a brand-new store reading localStorage. */
function reloadStore(): SettingsStore {
  TestBed.resetTestingModule();
  return createStore();
}

function saved(): Record<string, unknown> {
  return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}');
}

const root = () => document.documentElement;

describe('SettingsStore — themes', () => {
  beforeEach(() => {
    useMemoryStorage();
    root().removeAttribute('data-theme');
    root().removeAttribute('data-dark-theme');
  });

  it('starts new users in light mode with Visual Studio Dark ready as the dark theme', () => {
    const store = createStore();
    expect(store.themeMode()).toBe('light');
    expect(store.darkTheme()).toBe('visual-studio-dark');
    expect(store.activeTheme()).toBe('light');
    expect(root().getAttribute('data-theme')).toBe('light');
  });

  it('activates Visual Studio Dark the first time dark mode is turned on', () => {
    const store = createStore();
    store.toggleThemeMode();
    TestBed.tick();

    expect(store.activeTheme()).toBe('visual-studio-dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(root().getAttribute('data-dark-theme')).toBe('visual-studio-dark');
  });

  it('selecting a dark theme switches to dark mode and persists the choice', () => {
    const store = createStore();
    store.setDarkTheme('dracula');
    TestBed.tick();

    expect(store.themeMode()).toBe('dark');
    expect(store.activeTheme()).toBe('dracula');
    expect(root().getAttribute('data-dark-theme')).toBe('dracula');
    expect(saved()).toMatchObject({ themeMode: 'dark', darkTheme: 'dracula' });
  });

  it('keeps the last dark theme while in light mode and restores it on return', () => {
    const store = createStore();
    store.setDarkTheme('one-dark-pro');
    store.setThemeMode('light');
    TestBed.tick();

    expect(store.activeTheme()).toBe('light');
    expect(store.darkTheme()).toBe('one-dark-pro');
    expect(saved()).toMatchObject({ themeMode: 'light', darkTheme: 'one-dark-pro' });

    store.toggleThemeMode();
    TestBed.tick();
    expect(store.activeTheme()).toBe('one-dark-pro');
  });

  it('restores mode and dark theme after a reload', () => {
    const first = createStore();
    first.setDarkTheme('jetbrains-islands-dark');
    TestBed.tick();

    const reloaded = reloadStore();
    expect(reloaded.themeMode()).toBe('dark');
    expect(reloaded.darkTheme()).toBe('jetbrains-islands-dark');
    expect(root().getAttribute('data-dark-theme')).toBe('jetbrains-islands-dark');
  });

  it('respects settings saved before dark themes existed', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ themeMode: 'dark', confirmDownloads: false, syncScroll: false })
    );
    const store = createStore();

    expect(store.themeMode()).toBe('dark');
    expect(store.darkTheme()).toBe('visual-studio-dark');
    expect(store.confirmDownloads()).toBe(false);
    expect(store.syncScroll()).toBe(false);
    expect(saved()).toMatchObject({ confirmDownloads: false, syncScroll: false });
  });

  it('falls back to Visual Studio Dark when the stored dark theme is unknown', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ themeMode: 'dark', darkTheme: 'solarized' })
    );
    const store = createStore();
    expect(store.darkTheme()).toBe('visual-studio-dark');
    expect(store.activeTheme()).toBe('visual-studio-dark');
  });
});

describe('SettingsStore — Convert case tool', () => {
  beforeEach(() => {
    useMemoryStorage();
  });

  it('is enabled with every format by default', () => {
    const store = createStore();
    expect(store.caseToolbarEnabled()).toBe(true);
    expect(store.caseFormats()).toEqual([
      'camel', 'pascal', 'snake', 'upper-snake', 'kebab', 'flat', 'train',
    ]);
  });

  it('persists the switch and the chosen formats in menu order', () => {
    const store = createStore();
    store.setCaseToolbarEnabled(false);
    store.setCaseFormatEnabled('pascal', false);
    store.setCaseFormatEnabled('kebab', false);
    store.setCaseFormatEnabled('pascal', true);
    TestBed.tick();

    const reloaded = reloadStore();
    expect(reloaded.caseToolbarEnabled()).toBe(false);
    expect(reloaded.caseFormats()).toEqual(['camel', 'pascal', 'snake', 'upper-snake', 'flat', 'train']);
  });

  it('ignores unknown stored formats and keeps older settings untouched', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ themeMode: 'dark', caseFormats: ['snake', 'shout', 'camel'] })
    );
    const store = createStore();
    expect(store.caseFormats()).toEqual(['camel', 'snake']);
    expect(store.caseToolbarEnabled()).toBe(true);
    expect(store.themeMode()).toBe('dark');
  });
});
