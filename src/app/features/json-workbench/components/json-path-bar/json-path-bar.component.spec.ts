import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JsonPathBarComponent } from './json-path-bar.component';

describe('JsonPathBarComponent', () => {
  let fixture: ComponentFixture<JsonPathBarComponent>;
  let ref: ComponentRef<JsonPathBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonPathBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JsonPathBarComponent);
    ref = fixture.componentRef;
  });

  it('shows the placeholder hint when no path is detected', () => {
    ref.setInput('text', '{"a":1}');
    ref.setInput('cursorOffset', null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Click a JSON value to inspect its path.');
  });

  it('renders the dot path when the cursor is on a value', () => {
    const text = '{"user":{"name":"Isaac"}}';
    ref.setInput('text', text);
    ref.setInput('cursorOffset', text.indexOf('"Isaac"') + 2);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.json-path-bar__value')?.textContent).toContain('user.name');
    expect(el.querySelectorAll('.json-path-bar__chip').length).toBeGreaterThanOrEqual(5);
  });

  it('shows the invalid-json warning', () => {
    ref.setInput('text', '{"a":');
    ref.setInput('cursorOffset', 2);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Path unavailable: invalid JSON.');
  });

  it('emits a status message after copying a path', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const text = '{"user":{"name":"Isaac"}}';
    ref.setInput('text', text);
    ref.setInput('cursorOffset', text.indexOf('"Isaac"') + 2);
    fixture.detectChanges();

    const messages: string[] = [];
    fixture.componentInstance.statusMessage.subscribe((m) => messages.push(m));

    await fixture.componentInstance.copy('js');
    expect(writeText).toHaveBeenCalledWith('data.user.name');
    expect(messages).toContain('JS path copied.');

    vi.unstubAllGlobals();
  });
});
