import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ICON_NAMES, IconComponent, IconName } from './icon.component';

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconComponent>;
  let ref: ComponentRef<IconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [IconComponent] }).compileComponents();
    fixture = TestBed.createComponent(IconComponent);
    ref = fixture.componentRef;
  });

  it('renders an svg with at least one path for a known icon', () => {
    ref.setInput('name', 'translate');
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('applies the requested size', () => {
    ref.setInput('name', 'copy');
    ref.setInput('size', 24);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg!.getAttribute('width')).toBe('24');
    expect(svg!.getAttribute('height')).toBe('24');
  });

  it('exposes an aria-label when provided and drops aria-hidden', () => {
    ref.setInput('name', 'check');
    ref.setInput('ariaLabel', 'Done');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('aria-label')).toBe('Done');
    expect(host.getAttribute('aria-hidden')).toBeNull();
  });

  it.each(ICON_NAMES)('renders the %s icon with drawable paths', (name: IconName) => {
    ref.setInput('name', name);
    fixture.detectChanges();
    const paths = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('path'));
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.getAttribute('d')).toMatch(/^M/);
    }
  });

  it('gives every icon a distinct drawing', () => {
    const drawings = ICON_NAMES.map((name) => {
      ref.setInput('name', name);
      fixture.detectChanges();
      return Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('path'),
        (path) => path.getAttribute('d')
      ).join('|');
    });
    expect(new Set(drawings).size).toBe(ICON_NAMES.length);
  });

  it('draws swap horizontally, matching the side-by-side panels', () => {
    ref.setInput('name', 'swap');
    fixture.detectChanges();
    const first = (fixture.nativeElement as HTMLElement).querySelector('path')!.getAttribute('d')!;
    expect(first).toMatch(/^M\d+ \d+h/);
  });
});

