import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-shortcut-hint',
  template: `<kbd class="kbd" [attr.aria-label]="'Keyboard shortcut: ' + keys()">{{ keys() }}</kbd>`,
  styles: `
    .kbd {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xs);
      color: var(--color-text-muted);
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: var(--weight-medium);
      letter-spacing: 0.03em;
      line-height: 1;
      padding: 0.15rem 0.35rem;
      vertical-align: middle;
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShortcutHintComponent {
  readonly keys = input.required<string>();
}
