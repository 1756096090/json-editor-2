# JSON Workbench — Product Tracker

> **Stack**: Angular 21 · Monaco Editor · Signals · OnPush · Standalone Components
> **Commands**: `ng serve` · `ng build` · `ng test`

---

## ESTADO ACTUAL DEL PRODUCTO

| Campo | Valor |
|---|---|
| **Módulo en curso** | ✅ Fase 3 completa — Multi-tab, Schema Validator, JSONPath Tester, Schema Generator, Compare mejorado, PWA |
| **Siguiente módulo** | Fase 4 — Share links, Favoritos, Graph View, Plan Pro |
| **Fase activa** | Fase 4: Expansión / Premium |
| **Última actualización** | 2026-04-05 |

---

## ROADMAP POR FASES

### ✅ Fase 1 — MVP Vendible (COMPLETADA)
> El producto pasa de "herramienta suelta" a "suite con workspace profesional".

| # | Tarea | Estado | Archivo clave |
|---|---|---|---|
| 1.1 | README con tracking | ✅ | `README.md` |
| 1.2 | Design tokens: estados de módulos | ✅ | `styles.scss` |
| 1.3 | Componente `module-badge` | ✅ | `components/ui/module-badge/` |
| 1.4 | Componente `tool-card` | ✅ | `components/ui/tool-card/` |
| 1.5 | Header global (`app-header`) | ✅ | `components/ui/app-header/` |
| 1.6 | Home feature (hero + grid) | ✅ | `features/home/` |
| 1.7 | Rutas: `/` home + `/tools/*` | ✅ | `app.routes.ts` |
| 1.8 | App shell con header integrado | ✅ | `app.component.ts` |
| 1.9 | 8 páginas SEO tool | ✅ | `features/tools/*/` |
| 1.10 | Workspace empty state mejorado | ✅ | `editor-panel/` |
| 1.11 | Toolbar: jerarquía visual | ✅ | `toolbar/` |
| 1.12 | index.html branding + meta | ✅ | `index.html` |

---

### ✅ Fase 2 — Crecimiento SEO (COMPLETADA)
> Capturar tráfico orgánico y aumentar tiempo en el producto.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 2.1 | Historial de documentos recientes (localStorage) | ✅ | `core/recent-docs.service.ts` — max 10 docs, visible en home |
| 2.2 | Import desde URL | ✅ | Botón "From URL" en toolbar, inline form con validación |
| 2.3 | Autosave local + indicador | ✅ | Indicador "Autosaved HH:MM" en toolbar meta |
| 2.4 | Search dentro del JSON (Ctrl+F) | ✅ | Monaco built-in — `openFind()` vía `panel?.openFind()` |
| 2.5 | Undo / Redo global confiable | ✅ | Monaco gestiona internamente — Ctrl+Z / Ctrl+Y |
| 2.6 | JSON Cleaner page | ✅ | `features/tools/json-cleaner/` — remove nulls, empties, extras |
| 2.7 | JSON Sorter page | ✅ | `features/tools/json-sorter/` — sort keys alphabetically |
| 2.8 | SEO meta por página herramienta | ✅ | Angular `Title` + `Meta` en los 10 tool pages |

---

### ✅ Fase 3 — Diferenciación UX (COMPLETADA)
| # | Tarea | Estado | Notas |
|---|---|---|---|
| 3.1 | Multi-tab de documentos | ✅ | `TabsService` + `TabBarComponent` — hasta 10 tabs, persistidos en localStorage |
| 3.2 | JSON Schema Validator | ✅ | `tools/json-schema-validator/` — validación draft-07 pura en TypeScript, sin librerías externas |
| 3.3 | JSONPath Tester | ✅ | `tools/json-path-tester/` — evaluador JSONPath puro: `$`, `.key`, `..key`, `[n]`, `[*]`, slices, unions |
| 3.4 | Auto Schema Generator | ✅ | `tools/json-schema-generator/` — genera JSON Schema draft-07 desde cualquier JSON con un clic |
| 3.5 | JSON Compare mejorado (diff semántico) | ✅ | Intro enriquecida con leyenda de colores y atajos de teclado |
| 3.6 | PWA / modo offline | ✅ | `@angular/service-worker` + `ngsw-config.json` + `manifest.webmanifest` |

---

### ⬜ Fase 4 — Expansión / Premium
| # | Tarea | Estado |
|---|---|---|
| 4.1 | Share links con expiración | ⬜ |
| 4.2 | Favoritos y colecciones | ⬜ |
| 4.3 | Graph View / árbol visual | ⬜ |
| 4.4 | Plan No Ads / Pro | ⬜ |
| 4.5 | API pública | ⬜ |

---

## REGLAS DE PRODUCTO (leer antes de cualquier cambio)

### Arquitectura visual
- **Dos capas**: Core Workspace (`/workbench`) + SEO Tool Suite (`/tools/*`)
- **Shell compartido**: mismo header, mismo design system, mismos tokens en todas las páginas
- **Home** (`/`): hub comercial — no redirigir directo al workbench

### Jerarquía visual (obligatoria)
```
Nivel 1 — domina:         Contenido del editor / resultado de herramienta
Nivel 2 — soporte:        Toolbar de acciones principales (Format, Validate, Compare)
Nivel 3 — contextual:     Status, errores, validación
Nivel 4 — exploración:    Settings, navegación, discovery
Nivel 5 — background:     Anuncios (nunca en workspace)
```

### Design tokens de color (usar SIEMPRE tokens, nunca valores hardcoded)
| Propósito | Token |
|---|---|
| Acción primaria | `--color-accent` |
| Estado válido / éxito | `--color-success` |
| Error / inválido | `--color-error` |
| Badge "New" | `--color-badge-new` |
| Badge "Coming soon" | `--color-badge-soon` |
| Badge "Pro" | `--color-badge-pro` |
| Badge "Most used" | `--color-badge-popular` |
| Badge "Beta" | `--color-badge-beta` |

### Reglas de estados de módulos
| Estado | Badge text | Límite en pantalla | CTA |
|---|---|---|---|
| `active` | ninguno | sin límite | "Open [Tool]" |
| `most-used` | `most used` | máx 3 por grid | igual que active |
| `recommended` | `recommended` | máx 1 por pantalla | "Try it now" |
| `new` | `new` | máx 60 días | igual que active |
| `coming-soon` | `coming soon` | **máx 4** por pantalla | "Notify me" |
| `premium` | `pro` | sin límite | "See Pro features" |
| `experimental` | `beta` | sin límite | "Try Beta" |
| `draft` | — | **NUNCA visible** al usuario | — |

### Reglas de Copy UX (obligatorias)
- CTAs: siempre verbo al inicio. "Open Formatter", "Try Validator", "Download JSON"
- Badges: siempre minúsculas. `new`, `most used`, `coming soon`, `pro`, `beta`
- Errores: Qué pasó + causa + CTA. "Invalid JSON at line 4 · Unexpected token · Fix automatically"
- Toasts: cortos, con dato útil si es posible. "Copied" ✓ / "Minified — 34% smaller" ✓
- Tooltips: máx 1 línea. Si hay shortcut, al final: "Format JSON (Ctrl+Shift+F)"
- Empty states: headline + descripción + CTA primario + CTA secundario opcional

### Reglas de anuncios (sin excepción)
- ✅ Permitidos: below the fold en `/tools/*`, sidebar derecho en desktop, footer home
- ❌ Prohibidos: dentro de `/workbench`, en el header, entre editor y controles, como popup
- Siempre con label "Advertisement" en `text-xs color-text-muted`
- Margen mínimo `--space-8` entre anuncio y contenido
- Sin animaciones ni autoplay

### Reglas de "Coming Soon"
- Máximo **4** módulos coming soon visibles en cualquier pantalla
- Siempre en sección separada con título "What's next", nunca mezclados con disponibles
- La descripción describe el BENEFICIO futuro, no el estado de desarrollo
- CTA debe capturar algo útil (email/waitlist), nunca un botón muerto

### Reglas de componentes Angular
- `ChangeDetectionStrategy.OnPush` en todos los componentes
- `input()` / `output()` functions, NO decoradores `@Input` / `@Output`
- `inject()` en lugar de constructor injection
- `computed()` para estado derivado
- Control flow nativo: `@if`, `@for`, `@switch` (nunca `*ngIf`, `*ngFor`)
- NO `standalone: true` (default en Angular 20+)
- Bindings `[class]` / `[style]`, NO `ngClass` / `ngStyle`
- Host bindings en el objeto `host` del decorador, NO `@HostBinding`

### Lo que NO tocar todavía
- ❌ Sistema de cuentas / auth
- ❌ Plan Pro / No Ads visible
- ❌ Share links
- ❌ Graph View
- ❌ Tabs de documentos
- ❌ JSONPath Tester (coming soon solo)
- ❌ Más de 4 módulos coming soon

---

## MAPA DE ARCHIVOS CLAVE

```
src/
  index.html                          ← Meta/title global
  styles.scss                         ← Design tokens (FUENTE ÚNICA DE ESTILOS)
  app/
    app.component.ts/html             ← Shell: header + router-outlet
    app.routes.ts                     ← Todas las rutas
    components/ui/
      module-badge/                   ← Badge de estado (new, most-used, etc.)
      tool-card/                      ← Card de herramienta del grid
      app-header/                     ← Header global persistente
      button/                         ← UI button base
      empty-state/                    ← Empty state base
      status-badge/                   ← Valid/Invalid badge
    features/
      home/                           ← Home page (/)
      json-workbench/                 ← Core Workspace (/workbench)
      tools/
        json-formatter/               ← /tools/json-formatter
        json-validator/               ← /tools/json-validator
        json-viewer/                  ← /tools/json-viewer
        json-compare/                 ← /tools/json-compare
        json-minifier/                ← /tools/json-minifier
        json-to-yaml/                 ← /tools/json-to-yaml
        json-to-csv/                  ← /tools/json-to-csv
        json-to-xml/                  ← /tools/json-to-xml
      settings/                       ← SettingsStore (providedIn root)
    shared/
      auto-fix-modal/
      confirm-dialog/
      settings-panel/
    core/
      json-error.utils.ts
      json.utils.ts
      monaco-loader.service.ts
      storage.service.ts
```

---

## Comandos de desarrollo

```bash
ng serve          # servidor dev en http://localhost:4200
ng build          # build producción en /dist
ng test           # tests con Vitest
ng generate component features/tools/json-formatter/json-formatter
```

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
