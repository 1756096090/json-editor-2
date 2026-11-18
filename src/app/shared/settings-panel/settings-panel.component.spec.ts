import { TestBed } from '@angular/core/testing';
import { SettingsPanelComponent } from './settings-panel.component';
import { SettingsStore } from '../../features/settings/settings.store';
import { useMemoryStorage } from '../../testing/memory-storage';

describe('SettingsPanelComponent', () => {
  beforeEach(() => {
    useMemoryStorage();
  });

  function setup() {
    TestBed.configureTestingModule({ imports: [SettingsPanelComponent] });
    const fixture = TestBed.createComponent(SettingsPanelComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const store = TestBed.inject(SettingsStore);
    const radio = (name: string, value: string) =>
      el.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)!;
    return { fixture, el, store, radio };
  }

  it('lists the four dark themes by name, each with a color preview', () => {
    const { el } = setup();
    const names = Array.from(
      el.querySelectorAll('input[name="dark-theme"]'),
      (input) => input.closest('label')?.querySelector('.theme-option__name')?.textContent?.trim()
    );
    expect(names).toEqual(['Visual Studio Dark', 'One Dark Pro', 'Dracula', 'JetBrains Islands Dark']);

    const previews = Array.from(
      el.querySelectorAll('input[name="dark-theme"] ~ .theme-swatch'),
      (swatch) => swatch.getAttribute('data-theme-preview')
    );
    expect(previews).toEqual(['visual-studio-dark', 'one-dark-pro', 'dracula', 'jetbrains-islands-dark']);
  });

  it('marks Visual Studio Dark as the selected dark theme for a new user', () => {
    const { radio } = setup();
    expect(radio('theme-mode', 'light').checked).toBe(true);
    expect(radio('dark-theme', 'visual-studio-dark').checked).toBe(true);
  });

  it('applies a dark theme when its option is chosen', () => {
    const { fixture, store, radio } = setup();
    radio('dark-theme', 'dracula').click();
    fixture.detectChanges();

    expect(store.themeMode()).toBe('dark');
    expect(store.activeTheme()).toBe('dracula');
    expect(radio('theme-mode', 'dark').checked).toBe(true);
  });

  it('switching to light keeps the chosen dark theme selected', () => {
    const { fixture, store, radio } = setup();
    radio('dark-theme', 'one-dark-pro').click();
    fixture.detectChanges();
    radio('theme-mode', 'light').click();
    fixture.detectChanges();

    expect(store.activeTheme()).toBe('light');
    expect(radio('dark-theme', 'one-dark-pro').checked).toBe(true);
  });

  it('turns the Convert case tool off and disables its format choices', () => {
    const { fixture, el, store } = setup();
    const toggle = el.querySelector<HTMLInputElement>('input[name="case-tool"]')!;
    expect(toggle.checked).toBe(true);

    toggle.click();
    fixture.detectChanges();

    expect(store.caseToolbarEnabled()).toBe(false);
    const formats = el.querySelectorAll<HTMLInputElement>('input[name="case-format"]');
    expect(formats.length).toBe(7);
    expect(Array.from(formats).every((input) => input.disabled)).toBe(true);
  });

  it('removes a format from the menu when unchecked', () => {
    const { fixture, el, store } = setup();
    el.querySelector<HTMLInputElement>('input[name="case-format"][value="kebab"]')!.click();
    fixture.detectChanges();
    expect(store.caseFormats()).not.toContain('kebab');
    expect(store.caseFormats()).toContain('camel');
  });

  it('emits closed from the Done button', () => {
    const { fixture, el } = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));
    el.querySelector<HTMLButtonElement>('.settings__done')!.click();
    expect(closed).toBe(true);
  });
});
