import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';

/**
 * Shared collapsible intro block for all tool pages.
 *
 * Usage:
 *   <app-tool-intro title="JSON Formatter">
 *     <span slot="subtitle">Plain or <strong>rich</strong> subtitle text.</span>
 *     <!-- optional action buttons -->
 *     <div slot="actions"><button>Do something</button></div>
 *   </app-tool-intro>
 */
@Component({
  selector: 'app-tool-intro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tool-intro-host' },
  template: `
    @if (!collapsed()) {
      <div class="tool-intro">

        <div class="tool-intro__body">
          <div class="tool-intro__text">
            <h1 class="tool-intro__title">{{ title() }}</h1>
            <div class="tool-intro__subtitle">
              <ng-content select="[slot=subtitle]" />
            </div>
          </div>

          <ng-content select="[slot=actions]" />
        </div>

        <button
          class="tool-intro__dismiss"
          type="button"
          aria-label="Hide introduction"
          title="Hide introduction"
          (click)="collapsed.set(true)"
        >×</button>

      </div>
    } @else {
      <button
        class="tool-intro__restore"
        type="button"
        aria-label="Show introduction"
        title="Show introduction"
        (click)="collapsed.set(false)"
      >ℹ Show intro</button>
    }
  `,
  styles: `
    :host, .tool-intro-host {
      display: block;
      flex-shrink: 0;
    }

    /* ── Intro block ─────────────────────────────────────────── */
    .tool-intro {
      align-items: flex-start;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      position: relative;
    }

    .tool-intro__body {
      align-items: flex-start;
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      gap: var(--space-3) var(--space-6);
      min-width: 0;
    }

    .tool-intro__text {
      flex: 1;
      min-width: 200px;
    }

    .tool-intro__title {
      color: var(--color-text);
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      letter-spacing: -0.01em;
      margin: 0 0 var(--space-1);
    }

    .tool-intro__subtitle {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      line-height: var(--leading-relaxed);
      max-width: 640px;
    }

    /* ── Dismiss button ──────────────────────────────────────── */
    .tool-intro__dismiss {
      align-items: center;
      background: none;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      cursor: pointer;
      display: flex;
      flex-shrink: 0;
      font-size: 1.25rem;
      height: 1.75rem;
      justify-content: center;
      line-height: 1;
      padding: 0;
      transition: background var(--duration-fast), color var(--duration-fast),
        border-color var(--duration-fast);
      width: 1.75rem;
    }

    .tool-intro__dismiss:hover {
      background: var(--color-surface-raised);
      border-color: var(--color-border);
      color: var(--color-text);
    }

    .tool-intro__dismiss:focus-visible {
      outline: var(--focus-ring);
      outline-offset: 2px;
    }

    /* ── Restore pill ─────────────────────────────────────────── */
    .tool-intro__restore {
      align-items: center;
      background: none;
      border: none;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text-muted);
      cursor: pointer;
      display: flex;
      font-size: var(--text-xs, 0.75rem);
      gap: var(--space-1);
      justify-content: flex-end;
      padding: var(--space-1) var(--space-4);
      width: 100%;
      transition: color var(--duration-fast);
    }

    .tool-intro__restore:hover {
      color: var(--color-text);
    }

    .tool-intro__restore:focus-visible {
      outline: var(--focus-ring);
      outline-offset: -2px;
    }

    @media (max-width: 640px) {
      .tool-intro {
        padding: var(--space-3);
      }
    }
  `,
})
export class ToolIntroComponent {
  readonly title = input.required<string>();
  readonly collapsed = signal(false);
}

