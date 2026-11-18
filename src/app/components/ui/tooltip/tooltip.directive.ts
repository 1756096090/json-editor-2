import { Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { TooltipComponent } from './tooltip.component';
import { ExplainModeService } from './explain-mode.service';

let nextTooltipId = 0;

@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'leave()',
    '(focusin)': 'focus()',
    '(focusout)': 'blur()',
    '(document:keydown.escape)': 'hide()',
    '(click)': 'hide()',
    '(pointerdown)': 'hide()',
  },
})
export class TooltipDirective implements OnDestroy {
  readonly appTooltip = input('');
  private readonly overlay = inject(Overlay);
  private readonly explainMode = inject(ExplainModeService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly id = `ui-tooltip-${nextTooltipId++}`;
  private overlayRef?: OverlayRef;
  private focused = false;

  show(): void {
    if (!this.appTooltip() || this.overlayRef) return;
    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(this.element)
      .withViewportMargin(8)
      .withPush(true)
      .withPositions([
        { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
      ]);
    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
    });
    this.overlayRef.detachments().subscribe(() => this.hide());
    const tooltip = this.overlayRef.attach(new ComponentPortal(TooltipComponent));
    tooltip.setInput('text', this.appTooltip());
    tooltip.setInput('expanded', this.explainMode.enabled());
    tooltip.setInput('description', this.explainMode.describe(this.appTooltip()));
    tooltip.setInput('tooltipId', this.id);
    const host = this.element.nativeElement;
    const ids = host.getAttribute('aria-describedby')?.split(/\s+/).filter(Boolean) ?? [];
    host.setAttribute('aria-describedby', [...ids, this.id].join(' '));
  }

  focus(): void { this.focused = true; this.show(); }
  blur(): void { this.focused = false; this.hide(); }
  leave(): void { if (!this.focused) this.hide(); }

  hide(): void {
    const ref = this.overlayRef;
    this.overlayRef = undefined;
    ref?.dispose();
    const host = this.element.nativeElement;
    const ids = (host.getAttribute('aria-describedby') ?? '').split(/\s+/)
      .filter(id => id && id !== this.id);
    if (ids.length) host.setAttribute('aria-describedby', ids.join(' '));
    else host.removeAttribute('aria-describedby');
  }

  ngOnDestroy(): void { this.hide(); }
}
