# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**json-editor-2** is an Angular 21 PWA that provides a suite of JSON tools:
- **Workbench** (`/workbench`): dual-pane JSON editor with diff, tabs, auto-fix, YAML/CSV/XML conversion
- **Editor Lab** (`/editor-lab`): format-agnostic dual-pane editor with version history, per-pane format switching, and inline diff compare
- **Tool pages** (`/tools/*`): standalone SEO-optimized tools (formatter, validator, viewer, compare, minifier, sorter, cleaner, path tester, schema generator/validator, JSON↔YAML, JSON↔CSV, JSON↔XML, error finder)
- **Home** (`/`): landing/discovery hub

### Tech Stack
- Angular **21.2** (standalone components, signals, `@angular/router` lazy-loaded routes) + Angular Material + Angular CDK
- TypeScript **5.9** (strict mode)
- Monaco Editor (`monaco-editor ^0.55.1`) for code editing
- `diff` library for text diffing
- `jsoneditor ^10.4.2` for tree/table views
- Vitest (via `@angular/build:unit-test`) — **not Karma/Jasmine**
- Angular Service Worker (`@angular/service-worker`) for PWA
- Prettier (printWidth 100, singleQuote, angular HTML parser)

### Commands
```bash
npm start          # ng serve (dev server)
npm run build      # ng build (production)
npm test           # ng test — runs Vitest via @angular/build:unit-test
npm run watch      # ng build --watch --configuration development
```

To filter tests by file pattern: `npm test -- --reporter=verbose`

---

## Project Architecture

```
src/app/
├── app.component.ts              # Root component
├── app.config.ts                 # provideRouter, provideServiceWorker
├── app.routes.ts                 # All lazy-loaded routes
├── core/
│   ├── storage.service.ts        # localStorage wrapper
│   ├── tabs.service.ts           # Left/right tab management (signal-based)
│   ├── recent-docs.service.ts
│   ├── monaco-loader.service.ts
│   ├── json.utils.ts
│   ├── json-error.utils.ts
│   └── formats/                  # Format handler system — key extension point
│       ├── data-format-handler.interface.ts   # DataFormatHandler interface
│       ├── format-registry.service.ts         # Registry of all handlers
│       ├── base/base-format-handler.ts
│       ├── json-format.handler.ts
│       ├── yaml-format.handler.ts
│       ├── csv-format.handler.ts
│       ├── xml-format.handler.ts
│       └── models/               # ColorRule, PatternResult, FormatterTheme, FormatterType
├── features/
│   ├── home/                     # Landing page
│   ├── editor-lab/               # Format-agnostic dual-pane editor with version history
│   │   ├── editor-lab.component.ts
│   │   ├── editor-format-strategies.ts
│   │   ├── components/editor-lab-pane/
│   │   └── services/editor-lab-io.service.ts
│   ├── json-workbench/           # Main JSON editor feature
│   │   ├── state/workbench.store.ts      # Central signal-based store
│   │   ├── services/
│   │   │   ├── workbench-actions.facade.ts
│   │   │   ├── panel-operations.facade.ts
│   │   │   ├── keyboard-handler.service.ts
│   │   │   └── live-diff.service.ts
│   │   ├── components/
│   │   │   ├── editor-panel/     # Wraps left/right editing panes
│   │   │   ├── editor-text/      # Monaco editor wrapper
│   │   │   ├── editor-diff/      # Monaco diff editor
│   │   │   ├── diff-bar/         # Diff controls
│   │   │   ├── converted-view/   # YAML/CSV/XML read-only output
│   │   │   └── inline-error-bar/ # Inline JSON error display
│   │   ├── utils/
│   │   │   ├── auto-fix-json.ts  # Heuristic JSON repair
│   │   │   ├── diff-engine.ts    # Text diff logic
│   │   │   ├── bracket-utils.ts
│   │   │   ├── convert.utils.ts  # JSON ↔ YAML/CSV/XML
│   │   │   └── file-utils.ts
│   │   └── workers/              # Web workers for heavy parsing
│   ├── settings/
│   │   └── settings.store.ts     # AppSettings signal store (theme, flags)
│   └── tools/                    # One component per tool page
│       ├── tool-page.css         # Shared tool page styles
│       ├── tool-intro/           # Shared intro block reused by tool pages
│       └── <tool-name>/
├── components/ui/                # Reusable UI components
│   ├── app-header/
│   ├── button/
│   ├── empty-state/
│   ├── error-banner/
│   ├── json-table-view/
│   ├── json-tree-view/
│   ├── module-badge/
│   ├── segmented-control/
│   ├── shortcut-hint/
│   ├── split-pane/
│   ├── status-badge/
│   ├── tab-bar/
│   ├── toast/
│   └── tool-card/
└── shared/                       # Feature-shared components
    ├── auto-fix-modal/
    ├── confirm-dialog/
    └── settings-panel/
```

### Format Handler System (`core/formats/`)
`DataFormatHandler` is the interface implemented by all format handlers (JSON, YAML, CSV, XML). Handlers are registered in `FormatRegistryService` and consumed by both `editor-lab` and `json-workbench`. To add a new format: implement `DataFormatHandler`, inject and call `registerFormat()` in `FormatRegistryService`.

### Key State: `WorkbenchStore` (`state/workbench.store.ts`)
- `rawText` — current left-panel text (signal)
- `baselineText` — right-panel / baseline text (signal)
- `leftMode` / `rightMode` — `'text' | 'tree' | 'table' | 'yaml' | 'csv' | 'xml'`
- `showDiff` — toggle diff mode
- `diffViewMode` — `'text' | 'tree' | 'table'`
- `activePanel` — `'left' | 'right'`
- All settings delegated to `SettingsStore`

### Key State: `SettingsStore` (`features/settings/settings.store.ts`)
- `themeMode`: `'light' | 'dark'`
- `confirmDownloads`, `formatOnAltClick`, `formatOnBadgeClick`
- `autoFixOnPasteEnabled`, `showOnlyDiffs`, `syncScroll`
- Persisted via `StorageService` (localStorage key prefix: `json-we-format:settings`)

### Storage key prefix
All localStorage keys use the prefix: `json-we-format:`

---

## Angular Best Practices

- Always use standalone components — do NOT set `standalone: true` (it is the default in Angular v20+)
- Use signals for state management; do NOT use `mutate()`, use `update()` or `set()` instead
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in all `@Component` decorators
- Use `inject()` function instead of constructor injection
- Use `input()` and `output()` functions instead of `@Input()` / `@Output()` decorators
- Do NOT use `@HostBinding` / `@HostListener` — put host bindings in the `host` object of `@Component`
- Do NOT use `ngClass` — use `[class]` bindings instead
- Do NOT use `ngStyle` — use `[style]` bindings instead
- Use `NgOptimizedImage` for static images (does not work for inline base64 images)
- Use native control flow: `@if`, `@for`, `@switch` — not `*ngIf`, `*ngFor`, `*ngSwitch`
- Implement lazy loading for all feature routes
- Prefer Reactive forms over Template-driven forms
- Do not write arrow functions in templates

## TypeScript Best Practices

- Strict mode is enabled — avoid `any`, use `unknown` when type is uncertain
- Prefer type inference when the type is obvious

## Accessibility Requirements

- Must pass all AXE checks
- Must follow WCAG AA minimums: focus management, color contrast, ARIA attributes

---

## Testing

- Test runner: **Vitest** (via `@angular/build:unit-test`; `npm test` calls `ng test`)
- Test files: `*.spec.ts` co-located next to the source file

---

## Adding a New Tool Page

1. Create folder: `src/app/features/tools/<tool-name>/`
2. Create component: `<tool-name>.component.ts` (standalone, OnPush, lazy-loaded)
3. Add shared styles: `@import '../tool-page.css';` in component stylesheet
4. Add route in `src/app/app.routes.ts` with path `tools/<tool-name>`
5. Add tool card in `HomeComponent` if it should be discoverable

---

## Implementation Rules

- **Do NOT create `.md` files** as output — never generate markdown documentation files
- **Do NOT add features, refactor, or make "improvements"** beyond what was asked
- **Do NOT add docstrings, comments, or type annotations** to code you didn't change
- **Do NOT add error handling** for scenarios that can't happen; only validate at system boundaries
- **Do NOT create helpers or abstractions** for one-time operations
- Read files before modifying them; understand existing code before suggesting changes
- Do not create files unless absolutely necessary; prefer editing existing files
- Take local reversible actions freely; ask before destructive actions (delete files, git reset --hard, etc.)

---

## TypeScript Patterns Used in This Codebase

### Signal-based store pattern
```ts
@Injectable({ providedIn: 'root' })
export class MyStore {
  private readonly _value = signal<string>('');
  readonly value = this._value.asReadonly();
  readonly derived = computed(() => this._value().trim());

  setValue(v: string): void { this._value.set(v); }
  update(fn: (v: string) => string): void { this._value.update(fn); }
}
```

### Component pattern
```ts
@Component({
  selector: 'app-my',
  imports: [...],
  templateUrl: './my.component.html',
  styleUrl: './my.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(click)': 'handleClick()' }   // host bindings here, NOT @HostListener
})
export class MyComponent {
  readonly value = input<string>('');     // input() not @Input()
  readonly changed = output<string>();    // output() not @Output()
  readonly store = inject(MyStore);       // inject() not constructor injection
  readonly derived = computed(() => this.value().toUpperCase());
}
```

### Template control flow
```html
@if (condition) {
  <div>shown</div>
} @else {
  <div>fallback</div>
}

@for (item of items(); track item.id) {
  <li>{{ item.name }}</li>
}

@switch (mode()) {
  @case ('text') { <app-text-editor /> }
  @case ('tree') { <app-tree-view /> }
}
```
