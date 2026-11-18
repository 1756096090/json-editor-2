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
  | 'close'
  | 'bolt'
  | 'check-circle'
  | 'search'
  | 'tree'
  | 'table'
  | 'shield-check'
  | 'braces'
  | 'wand'
  | 'settings'
  | 'convert'
  | 'help'
  | 'info'
  | 'chevron-down';

/** Inline SVG path data (24x24 viewBox, stroke-based) — no external icon libraries. */
const ICON_PATHS: Record<IconName, string[]> = {
  'open': [
    'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  ],
  'url': [
    'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
    'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  ],
  // Indented lines: "pretty-print / indent", not plain text alignment.
  'format': ['M3 5h18', 'M10 10h11', 'M10 14h11', 'M3 19h18', 'M3 9.5l3 2.5-3 2.5'],
  'minify': ['M4 14h6v6', 'M20 10h-6V4', 'M14 10l7-7', 'M3 21l7-7'],
  // Eraser: "remove values", not a pen (which reads as "edit").
  'clean': [
    'M8.5 20L3.7 15.2a1.6 1.6 0 0 1 0-2.3L13.4 3.2a1.6 1.6 0 0 1 2.3 0l5.1 5.1a1.6 1.6 0 0 1 0 2.3L11.1 20.3',
    'M8.6 8.3l7.1 7.1',
    'M8.5 20H21',
  ],
  'sort': ['M11 5h10', 'M11 12h7', 'M11 19h4', 'M6 4v16', 'M3 17l3 3 3-3'],
  'compare': [
    'M5 3h10l4 4v14H5z',
    'M15 3v4h4',
    'M8 11h6',
    'M11 8v6',
    'M8 18h6',
  ],
  'copy': [
    'M9 9h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9z',
    'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  ],
  'download': ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  'upload': ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  'repair': [
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  ],
  // Horizontal: the two panels sit side by side.
  'swap': ['M4 8h15', 'M15 4l4 4-4 4', 'M20 16H5', 'M9 12l-4 4 4 4'],
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
  'bolt': ['M13 2L4 14h7l-1 8 9-12h-7l1-8z'],
  'check-circle': ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M8 12l3 3 5-6'],
  'search': ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4-4'],
  'tree': ['M4 4h6v5H4z', 'M14 15h6v5h-6z', 'M14 4h6v5h-6z', 'M7 9v8.5h7', 'M10 6.5h4'],
  'table': ['M4 4h16v16H4z', 'M4 10h16', 'M4 15h16', 'M10 4v16'],
  'shield-check': ['M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z', 'M8.5 12l2.5 2.5 4.5-5'],
  'braces': [
    'M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2v0a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1',
    'M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2v0a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1',
  ],
  'wand': ['M15 4V2', 'M15 10V8', 'M11 6h2', 'M17 6h2', 'M3 21l12-12', 'M13 11l-2-2'],
  // Circular arrows: transform data into another format.
  'convert': [
    'M17 2l3 3-3 3',
    'M4 11V9a4 4 0 0 1 4-4h12',
    'M7 22l-3-3 3-3',
    'M20 13v2a4 4 0 0 1-4 4H4',
  ],
  'help': [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3',
    'M12 17h.01',
  ],
  'info': ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 16v-4', 'M12 8h.01'],
  'chevron-down': ['M6 9l6 6 6-6'],
  'settings': [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  ],
};

/** Every available icon name (useful for tests and galleries). */
export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

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
