
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.
![1777564324259](image/CLAUDE/1777564324259.png)
---

## Project Overview

**json-editor-2** is an Angular 21 PWA (Progressive Web App) that provides a suite of JSON tools:
- **Workbench** (`/workbench`): dual-pane JSON editor with diff, tabs, auto-fix, YAML/CSV/XML conversion
- **Tool pages** (`/tools/*`): standalone SEO-optimized tools (formatter, validator, viewer, compare, minifier, sorter, cleaner, path tester, schema generator/validator, JSON↔YAML, JSON↔CSV, JSON↔XML, error finder)
- **Home** (`/`): landing/discovery hub

### Tech Stack
- Angular **21.2** (standalone components, signals, `@angular/router` lazy-loaded routes)
- TypeScript **5.9** (strict mode)
- Monaco Editor (`monaco-editor ^0.55.1`) for code editing
- `diff` library for text diffing
- `jsoneditor ^10.4.2` for tree/table views
- Vitest (`vitest ^4.0.8`) for unit tests — **not Karma/Jasmine**
- Angular Service Worker (`@angular/service-worker`) for PWA
- Prettier (printWidth 100, singleQuote, angular HTML parser)

### Commands
```bash
npm start          # ng serve (dev server)
npm run build      # ng build (production)
npm test           # vitest (unit tests)
npm run watch      # ng build --watch --configuration development
```

---

## Project Architecture

```
src/app/
├── app.ts / app.component.ts     # Root component
├── app.config.ts                 # provideRouter, provideServiceWorker
├── app.routes.ts                 # All lazy-loaded routes
├── core/                         # Singleton services
│   ├── storage.service.ts        # localStorage wrapper
│   ├── tabs.service.ts           # Left/right tab management (signal-based)
│   ├── recent-docs.service.ts
│   ├── monaco-loader.service.ts
│   ├── json.utils.ts
│   └── json-error.utils.ts
├── features/
│   ├── home/                     # Landing page component
│   ├── json-workbench/           # Main editor feature
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
│   │   │   ├── toolbar/          # Top action bar
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

### Key State: `WorkbenchStore` (`state/workbench.store.ts`)
- `rawText` — current left-panel JSON text (signal)
- `baselineText` — right-panel / baseline JSON (signal)
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

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

---

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

---

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

---

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).

---

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

---

## Testing

- Test runner: **Vitest** (not Karma or Jest)
- Test files: `*.spec.ts` co-located next to the source file
- Example: `src/app/features/json-workbench/utils/auto-fix-json.spec.ts`
- Run tests: `npm test`

---

## Adding a New Tool Page

1. Create folder: `src/app/features/tools/<tool-name>/`
2. Create component: `<tool-name>.component.ts` (standalone, OnPush, lazy-loaded)
3. Add shared styles: `@import '../tool-page.css';` in component stylesheet
4. Add route in `src/app/app.routes.ts` with path `tools/<tool-name>`
5. Add tool card in `HomeComponent` if it should be discoverable

---

## Implementation Rules

- **Do NOT create `.md` files** to document changes. Never generate markdown documentation files as output.
- **Do NOT add features, refactor code, or make "improvements"** beyond what was asked.
- **Do NOT add docstrings, comments, or type annotations** to code you didn't change.
- **Do NOT add error handling** for scenarios that can't happen. Only validate at system boundaries.
- **Do NOT create helpers or abstractions** for one-time operations.
- **Avoid over-engineering.** Only make changes that are directly requested or clearly necessary.
- Read files before modifying them. Understand existing code before suggesting changes.
- Do not create files unless absolutely necessary. Prefer editing existing files.
- Take local reversible actions freely. For destructive actions (delete files, git reset --hard, etc.) ask the user first.

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
