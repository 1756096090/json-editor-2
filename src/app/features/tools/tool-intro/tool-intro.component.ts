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
  templateUrl: './tool-intro.component.html',
  styleUrl: './tool-intro.component.css',
})
export class ToolIntroComponent {
  readonly title = input.required<string>();
  readonly collapsed = signal(false);
}

