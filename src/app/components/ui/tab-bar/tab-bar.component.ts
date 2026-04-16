import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Tab } from '../../../core/tabs.service';

@Component({
  selector: 'app-tab-bar',
  imports: [],
  template: `
    @if (panelLabel()) {
      <span class="tab-bar__panel-label">{{ panelLabel() }}</span>
    }
    <div class="tab-bar" role="tablist" [attr.aria-label]="(panelLabel() || 'Document') + ' tabs'">
      @for (tab of tabs(); track tab.id) {
        <button
          role="tab"
          class="tab-bar__tab"
          [class.tab-bar__tab--active]="tab.id === activeTabId()"
          [attr.aria-selected]="tab.id === activeTabId()"
          [title]="tab.label"
          (click)="tabClicked.emit(tab.id)"
        >
          <span class="tab-bar__label">{{ tab.label }}</span>
          @if (tabs().length > 1) {
            <span
              class="tab-bar__close"
              role="button"
              tabindex="0"
              [attr.aria-label]="'Close ' + tab.label"
              (click)="$event.stopPropagation(); tabClosed.emit(tab.id)"
              (keydown.enter)="$event.stopPropagation(); tabClosed.emit(tab.id)"
              (keydown.space)="$event.stopPropagation(); $event.preventDefault(); tabClosed.emit(tab.id)"
            >×</span>
          }
        </button>
      }
      <button
        class="tab-bar__add"
        aria-label="New document tab"
        title="New tab"
        (click)="addTab.emit()"
      >＋</button>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .tab-bar__panel-label {
      font-size: 0.625rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      padding: 3px 10px 0;
      flex-shrink: 0;
    }

    .tab-bar {
      display: flex;
      align-items: stretch;
      background: var(--color-surface);
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
      flex: 1;
    }
    .tab-bar::-webkit-scrollbar { display: none; }

    .tab-bar__tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 14px;
      min-width: 100px;
      max-width: 200px;
      height: 36px;
      background: none;
      border: none;
      border-right: 1px solid var(--color-border);
      border-bottom: 2px solid transparent;
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      transition: color 0.15s, background 0.15s;
    }
    .tab-bar__tab:hover {
      background: var(--color-surface-raised);
      color: var(--color-text);
    }
    .tab-bar__tab--active {
      border-bottom-color: var(--color-accent);
      color: var(--color-text);
      background: var(--color-surface-raised);
    }

    .tab-bar__label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tab-bar__close {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 0.875rem;
      line-height: 1;
      color: var(--color-text-muted);
      transition: background 0.15s, color 0.15s;
    }
    .tab-bar__close:hover,
    .tab-bar__close:focus-visible {
      background: var(--color-error);
      color: white;
      outline: none;
    }

    .tab-bar__add {
      flex-shrink: 0;
      width: 36px;
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: 1.2rem;
      cursor: pointer;
      transition: color 0.15s, background 0.15s;
    }
    .tab-bar__add:hover {
      color: var(--color-accent);
      background: var(--color-surface-raised);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabBarComponent {
  readonly tabs = input.required<Tab[]>();
  readonly activeTabId = input.required<string>();
  readonly panelLabel = input<string>('');
  readonly tabClicked = output<string>();
  readonly tabClosed = output<string>();
  readonly addTab = output<void>();
}
