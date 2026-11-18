import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="ui-tooltip" [class.ui-tooltip--expanded]="expanded()" role="tooltip" [id]="tooltipId()">
    @if (expanded()) { <span class="ui-tooltip__label">MODO EXPLICAR</span><strong>{{ text() }}</strong><p>{{ description() }}</p> }
    @else { {{ text() }} }
  </div>`,
  styles: `
    :host { display: block; pointer-events: none; }
    .ui-tooltip {
      max-width: min(260px, calc(100vw - 16px));
      padding: 7px 10px;
      border: 1px solid var(--color-border-strong);
      border-radius: 6px;
      background: var(--color-surface-overlay);
      color: var(--text-primary);
      box-shadow: var(--shadow-md);
      font-family: var(--font-sans);
      font-size: 11px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .ui-tooltip--expanded { width: min(340px, calc(100vw - 16px)); max-width: min(340px, calc(100vw - 16px)); padding: 14px 16px; line-height: 1.6; font-size: 12px; border-color: color-mix(in srgb, var(--accent-primary) 35%, var(--color-border)); }
    .ui-tooltip__label { display: block; color: var(--accent-primary); letter-spacing: 1px; font-size: 9px; margin-bottom: 7px; }
    strong { display: block; font-size: 12px; }
    p { margin: 8px 0 0; color: var(--text-secondary); }
  `,
})
export class TooltipComponent {
  readonly expanded = input(false);
  readonly description = input('');
  readonly text = input.required<string>();
  readonly tooltipId = input.required<string>();
}
