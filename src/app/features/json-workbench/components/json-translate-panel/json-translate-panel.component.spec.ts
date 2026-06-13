import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { JsonTranslatePanelComponent } from './json-translate-panel.component';
import {
  TRANSLATION_PROVIDER,
  TRANSLATION_NOT_CONFIGURED_MESSAGE,
  type TranslationProvider,
} from '../../services/translation-provider';

describe('JsonTranslatePanelComponent', () => {
  function setup(provider: TranslationProvider) {
    TestBed.configureTestingModule({
      imports: [JsonTranslatePanelComponent],
      providers: [{ provide: TRANSLATION_PROVIDER, useValue: provider }],
    });
    const fixture = TestBed.createComponent(JsonTranslatePanelComponent);
    const ref: ComponentRef<JsonTranslatePanelComponent> = fixture.componentRef;
    return { fixture, ref };
  }

  it('renders the Translate action and the not-configured notice by default', () => {
    const provider: TranslationProvider = {
      enabled: false,
      translateText: () => Promise.reject(new Error('nope')),
    };
    const { fixture } = setup(provider);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Translate');
    expect(el.textContent).toContain(TRANSLATION_NOT_CONFIGURED_MESSAGE);
  });

  it('translates string values through an enabled provider and reports stats', async () => {
    const provider: TranslationProvider = {
      enabled: true,
      translateText: (value) => Promise.resolve(value.toUpperCase()),
    };
    const { fixture, ref } = setup(provider);
    ref.setInput('jsonValue', { name: 'john', age: 30 });
    fixture.detectChanges();

    await fixture.componentInstance.translate();
    fixture.detectChanges();

    const stats = fixture.componentInstance.stats();
    expect(stats?.stringsFound).toBe(1);
    expect(stats?.stringsTranslated).toBe(1);
    expect(fixture.componentInstance.resultText()).toContain('JOHN');
  });

  it('emits an apply event with the chosen target', async () => {
    const provider: TranslationProvider = {
      enabled: true,
      translateText: (value) => Promise.resolve(`[${value}]`),
    };
    const { fixture, ref } = setup(provider);
    ref.setInput('jsonValue', { a: 'x' });
    fixture.detectChanges();
    await fixture.componentInstance.translate();

    const events: { target: string }[] = [];
    fixture.componentInstance.applied.subscribe((e) => events.push(e));
    fixture.componentInstance.setApplyTarget('other');
    fixture.componentInstance.apply();

    expect(events.length).toBe(1);
    expect(events[0].target).toBe('other');
  });
});
