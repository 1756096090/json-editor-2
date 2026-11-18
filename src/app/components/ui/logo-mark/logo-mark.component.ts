import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * JSON Hunt isotype: JSON braces with an edit caret, on the brand-blue tile.
 * Decorative — the surrounding link/text carries the accessible name.
 * Size it from the parent with `width`/`height` on the host.
 */
@Component({
  selector: 'app-logo-mark',
  template: `
    <svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect class="logo-mark__tile" width="64" height="64" rx="14" />
      <g class="logo-mark__braces">
        <path d="M26 16H24Q19 16 19 21V27Q19 32 14 32Q19 32 19 37V43Q19 48 24 48H26" />
        <path d="M38 16H40Q45 16 45 21V27Q45 32 50 32Q45 32 45 37V43Q45 48 40 48H38" />
      </g>
      <rect class="logo-mark__caret" x="29.5" y="22" width="5" height="20" rx="2.5" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
      flex-shrink: 0;
      height: 30px;
      width: 30px;
    }

    .logo-mark {
      display: block;
      height: 100%;
      width: 100%;
    }

    .logo-mark__tile {
      fill: var(--brand-primary);
    }

    .logo-mark__braces {
      fill: none;
      stroke: var(--brand-on-primary);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 5;
    }

    .logo-mark__caret {
      fill: var(--brand-soft);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoMarkComponent {}
