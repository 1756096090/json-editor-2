import { Routes } from '@angular/router';

export const routes: Routes = [
  // Home — hub comercial y discovery de herramientas
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },

  // Core Workspace
  {
    path: 'workbench',
    loadComponent: () =>
      import('./features/json-workbench/json-workbench.component').then(
        (m) => m.JsonWorkbenchComponent
      ),
  },

  // ── SEO Tool Suite ──────────────────────────────────────────────
  {
    path: 'tools/json-formatter',
    loadComponent: () =>
      import('./features/tools/json-formatter/json-formatter.component').then(
        (m) => m.JsonFormatterComponent
      ),
  },
  {
    path: 'tools/json-validator',
    loadComponent: () =>
      import('./features/tools/json-validator/json-validator.component').then(
        (m) => m.JsonValidatorComponent
      ),
  },
  {
    path: 'tools/json-viewer',
    loadComponent: () =>
      import('./features/tools/json-viewer/json-viewer.component').then(
        (m) => m.JsonViewerComponent
      ),
  },
  {
    path: 'tools/json-compare',
    loadComponent: () =>
      import('./features/tools/json-compare/json-compare.component').then(
        (m) => m.JsonCompareComponent
      ),
  },
  {
    path: 'tools/json-minifier',
    loadComponent: () =>
      import('./features/tools/json-minifier/json-minifier.component').then(
        (m) => m.JsonMinifierComponent
      ),
  },
  {
    path: 'tools/json-to-yaml',
    loadComponent: () =>
      import('./features/tools/json-to-yaml/json-to-yaml.component').then(
        (m) => m.JsonToYamlComponent
      ),
  },
  {
    path: 'tools/json-to-csv',
    loadComponent: () =>
      import('./features/tools/json-to-csv/json-to-csv.component').then(
        (m) => m.JsonToCsvComponent
      ),
  },
  {
    path: 'tools/json-to-xml',
    loadComponent: () =>
      import('./features/tools/json-to-xml/json-to-xml.component').then(
        (m) => m.JsonToXmlComponent
      ),
  },

  {
    path: 'tools/json-cleaner',
    loadComponent: () =>
      import('./features/tools/json-cleaner/json-cleaner.component').then(
        (m) => m.JsonCleanerComponent
      ),
  },
  {
    path: 'tools/json-sorter',
    loadComponent: () =>
      import('./features/tools/json-sorter/json-sorter.component').then(
        (m) => m.JsonSorterComponent
      ),
  },

  {
    path: 'tools/json-schema-validator',
    loadComponent: () =>
      import('./features/tools/json-schema-validator/json-schema-validator.component').then(
        (m) => m.JsonSchemaValidatorComponent
      ),
  },

  {
    path: 'tools/json-path-tester',
    loadComponent: () =>
      import('./features/tools/json-path-tester/json-path-tester.component').then(
        (m) => m.JsonPathTesterComponent
      ),
  },

  {
    path: 'tools/json-schema-generator',
    loadComponent: () =>
      import('./features/tools/json-schema-generator/json-schema-generator.component').then(
        (m) => m.JsonSchemaGeneratorComponent
      ),
  },

  // Fallback
  {
    path: '**',
    redirectTo: '',
  },
];

