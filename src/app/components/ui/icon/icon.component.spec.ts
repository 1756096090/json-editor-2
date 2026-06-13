import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

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
});
