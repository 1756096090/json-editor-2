import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'open'
  | 'url'
  | 'format'
  | 'minify'
  | 'clean'
  | 'sort'
  | 'compare'
  | 'copy'
  | 'download'
  | 'upload'
  | 'repair'
  | 'swap'
  | 'arrow-right'
  | 'arrow-left'
  | 'translate'
  | 'path'
  | 'code'
  | 'check'
  | 'warning'
  | 'error'
  | 'close';

/** Inline SVG path data (24x24 viewBox, stroke-based) — no external icon libraries. */
const ICON_PATHS: Record<IconName, string[]> = {
  'open': [
    'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  ],
  'url': [
    'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
    'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  ],
  'format': ['M4 6h16', 'M4 12h10', 'M4 18h14'],
  'minify': ['M4 14h6v6', 'M20 10h-6V4', 'M14 10l7-7', 'M3 21l7-7'],
  'clean': [
    'M19 5L11.5 12.5',
    'M5 21c1.2-4.2 3.2-6.6 6.5-8.5l2 2C11.6 17.8 9.2 19.8 5 21z',
  ],
  'sort': ['M11 5h10', 'M11 12h7', 'M11 19h4', 'M6 4v16', 'M3 17l3 3 3-3'],
  'compare': ['M3 5h6v14H3z', 'M15 5h6v14h-6z', 'M12 3v18'],
  'copy': [
    'M9 9h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9z',
    'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  ],
  'download': ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  'upload': ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  'repair': [
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  ],
  'swap': ['M7 16V4', 'M3 8l4-4 4 4', 'M17 8v12', 'M21 16l-4 4-4-4'],
  'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
  'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
  'translate': [
    'M4 5h8',
    'M8 3v2',
    'M5 9c1.5 3.5 4.5 6.5 8 8',
    'M11 5c-.5 4-3 8-7 11',
    'M13 20l4.5-10L22 20',
    'M14.5 16.5h6',
  ],
  'path': [
    'M3 5a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
    'M17 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
    'M7 5h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h8',
  ],
  'code': ['M16 18l6-6-6-6', 'M8 6l-6 6 6 6'],
  'check': ['M20 6L9 17l-5-5'],
  'warning': [
    'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    'M12 9v4',
    'M12 17h.01',
  ],
  'error': ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 8v4', 'M12 16h.01'],
  'close': ['M18 6L6 18', 'M6 6l12 12'],
};

@Component({
  selector: 'app-ui-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-hidden]': 'ariaHidden() && !ariaLabel() ? "true" : null',
    '[attr.aria-label]': 'ariaLabel() ?? null',
    '[attr.role]': 'ariaLabel() ? "img" : null',
  },
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(16);
  readonly ariaHidden = input<boolean>(true);
  readonly ariaLabel = input<string | undefined>(undefined);

  readonly paths = computed(() => ICON_PATHS[this.name()] ?? []);
}
