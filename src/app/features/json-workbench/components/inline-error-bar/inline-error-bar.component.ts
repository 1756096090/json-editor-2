/**
 * inline-error-bar.component.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Inline error bar shown inside an editor panel when JSON parsing fails.
 * Features: warning icon, error message with line/col, "Show me" and "Auto repair" buttons.
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { JsonErrorPosition } from '../../../../core/json-error.utils';

@Component({
  selector: 'app-inline-error-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error-bar" role="alert" aria-live="assertive">
      <span class="error-bar__icon" aria-hidden="true">&#x26A0;</span>
      <span class="error-bar__message">
        {{ error().message }}
        <span class="error-bar__pos">
          (line {{ error().line }}, col {{ error().column }})
        </span>
      </span>
      <div class="error-bar__actions">
        <button
          type="button"
          class="error-bar__btn error-bar__btn--show"
          title="Scroll to error position"
          aria-label="Show me the error"
          (click)="showMe.emit()"
        >
          Show me
        </button>
        @if (autoFixEnabled()) {
          <button
            type="button"
            class="error-bar__btn error-bar__btn--repair"
            title="Attempt automatic JSON repair"
            aria-label="Auto repair JSON"
            (click)="autoRepair.emit()"
          >
            Auto repair
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .error-bar {
      align-items: center;
      background: color-mix(in srgb, var(--color-danger) 12%, var(--color-panel-bg));
      border-bottom: 2px solid var(--color-danger);
      box-sizing: border-box;
      display: flex;
      font-size: var(--text-sm, 0.78rem);
      gap: var(--space-2, 0.5rem);
      padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
      width: 100%;
    }

    .error-bar__icon {
      color: var(--color-danger);
      flex-shrink: 0;
      font-size: 1rem;
    }

    .error-bar__message {
      color: var(--color-danger);
      flex: 1;
      font-family: var(--font-mono, monospace);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .error-bar__pos {
      color: var(--color-text-muted);
      font-size: var(--text-xs, 0.7rem);
    }

    .error-bar__actions {
      display: flex;
      flex-shrink: 0;
      gap: var(--space-1, 0.25rem);
    }

    .error-bar__btn {
      border: 1px solid transparent;
      border-radius: var(--radius-xs, 0.2rem);
      cursor: pointer;
      font-family: var(--font-sans);
      font-size: var(--text-xs, 0.7rem);
      font-weight: var(--weight-semibold, 600);
      line-height: 1;
      padding: 3px 8px;
      transition: background 0.15s, opacity 0.15s;
    }

    .error-bar__btn:focus-visible {
      outline: var(--focus-ring);
    }

    .error-bar__btn--show {
      background: transparent;
      border-color: var(--color-danger);
      color: var(--color-danger);
    }

    .error-bar__btn--show:hover {
      background: color-mix(in srgb, var(--color-danger) 15%, transparent);
    }

    .error-bar__btn--repair {
      background: var(--color-warning-subtle, rgba(244, 185, 66, 0.12));
      border-color: var(--color-warning, #f4b942);
      color: var(--color-warning, #f4b942);
    }

    .error-bar__btn--repair:hover {
      background: color-mix(in srgb, var(--color-warning) 22%, transparent);
    }
  `,
})
export class InlineErrorBarComponent {
  /** The parsed JSON error. */
  readonly error = input.required<JsonErrorPosition>();
  /** Whether auto-fix button should be shown. */
  readonly autoFixEnabled = input<boolean>(true);

  /** Emitted when user clicks "Show me". */
  readonly showMe = output<void>();
  /** Emitted when user clicks "Auto repair". */
  readonly autoRepair = output<void>();
}
