import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { JsonCleanPanelComponent } from './json-clean-panel.component';
import type { JsonCleanOptions } from '../../utils/json-cleaner.utils';

describe('JsonCleanPanelComponent', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [JsonCleanPanelComponent] });
    const fixture = TestBed.createComponent(JsonCleanPanelComponent);
    const ref: ComponentRef<JsonCleanPanelComponent> = fixture.componentRef;
    return { fixture, ref };
  }

  it('renders the four cleaning options', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'input[type="checkbox"]'
    );
    expect(checkboxes.length).toBe(4);
  });

  it('previews how many values would be removed', () => {
    const { fixture, ref } = setup();
    ref.setInput('jsonValue', { a: null, b: '', c: 'keep', d: {} });
    fixture.detectChanges();
    // null + '' + {} = 3 removable
    expect(fixture.componentInstance.previewRemoved()).toBe(3);
  });

  it('reflects toggled options in the preview', () => {
    const { fixture, ref } = setup();
    ref.setInput('jsonValue', { a: null, b: '' });
    fixture.detectChanges();
    expect(fixture.componentInstance.previewRemoved()).toBe(2);

    fixture.componentInstance.toggle('removeEmptyStrings');
    expect(fixture.componentInstance.previewRemoved()).toBe(1);
  });

  it('emits the selected options on apply', () => {
    const { fixture, ref } = setup();
    ref.setInput('jsonValue', { a: null });
    fixture.detectChanges();

    const emitted: JsonCleanOptions[] = [];
    fixture.componentInstance.applied.subscribe((o) => emitted.push(o));
    fixture.componentInstance.toggle('removeEmptyArrays'); // turn off
    fixture.componentInstance.apply();

    expect(emitted.length).toBe(1);
    expect(emitted[0].removeEmptyArrays).toBe(false);
    expect(emitted[0].removeNull).toBe(true);
  });

  it('does not apply when no option is selected', () => {
    const { fixture, ref } = setup();
    ref.setInput('jsonValue', { a: null });
    fixture.detectChanges();

    const inst = fixture.componentInstance;
    inst.toggle('removeNull');
    inst.toggle('removeEmptyStrings');
    inst.toggle('removeEmptyArrays');
    inst.toggle('removeEmptyObjects');
    expect(inst.anySelected()).toBe(false);

    const emitted: JsonCleanOptions[] = [];
    inst.applied.subscribe((o) => emitted.push(o));
    inst.apply();
    expect(emitted.length).toBe(0);
  });
});
