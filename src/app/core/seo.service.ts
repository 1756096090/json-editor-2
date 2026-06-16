import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export const SITE_URL = 'https://jsonworkbench.dev';
const DEFAULT_IMAGE = `${SITE_URL}/assets/og-image.png`;

interface RouteSeo {
  title: string;
  description: string;
}

/** Per-route metadata. Keys are normalized paths without trailing slash. */
const ROUTE_SEO: Record<string, RouteSeo> = {
  '': {
    title: 'JSON Hunt — Format, Validate & Compare JSON',
    description:
      'The professional JSON workspace for developers. Format, validate, compare, minify and convert JSON. Fast, clean and distraction-free.',
  },
  '/workbench': {
    title: 'JSON Workbench — Dual-pane JSON Editor | JSON Hunt',
    description:
      'A full dual-pane JSON workspace: format, minify, clean, sort, compare with live diff, import from URL and convert to YAML, CSV or XML.',
  },
  '/tools/json-formatter': {
    title: 'JSON Formatter — Beautify & Format JSON Online | JSON Hunt',
    description:
      'Paste your JSON and instantly format and beautify it with proper indentation. Free online JSON formatter.',
  },
  '/tools/json-validator': {
    title: 'JSON Validator — Check & Fix JSON Errors Online | JSON Hunt',
    description:
      'Validate JSON and pinpoint syntax errors with line and column. Free online JSON validator with auto-fix.',
  },
  '/tools/json-error-finder': {
    title: 'JSON Error Finder — Locate JSON Syntax Errors | JSON Hunt',
    description: 'Find and explain JSON syntax errors fast. Free online JSON error finder.',
  },
  '/tools/json-viewer': {
    title: 'JSON Viewer — Explore JSON as Tree or Table | JSON Hunt',
    description:
      'View and explore JSON as an interactive tree or table. Navigate complex nested structures. Free online JSON viewer.',
  },
  '/tools/json-compare': {
    title: 'JSON Compare — Diff Two JSON Documents | JSON Hunt',
    description: 'Compare two JSON documents side by side with a live diff. Free online JSON compare tool.',
  },
  '/tools/json-minifier': {
    title: 'JSON Minifier — Compress JSON Online | JSON Hunt',
    description: 'Minify and compress JSON by removing whitespace. Free online JSON minifier.',
  },
  '/tools/json-to-yaml': {
    title: 'JSON to YAML Converter — Online | JSON Hunt',
    description: 'Convert JSON to YAML instantly in your browser. Free online JSON to YAML converter.',
  },
  '/tools/json-to-csv': {
    title: 'JSON to CSV Converter — Online | JSON Hunt',
    description: 'Convert JSON arrays to CSV instantly. Free online JSON to CSV converter.',
  },
  '/tools/json-to-xml': {
    title: 'JSON to XML Converter — Online | JSON Hunt',
    description: 'Convert JSON to XML with selectable encoding. Free online JSON to XML converter.',
  },
  '/tools/json-cleaner': {
    title: 'JSON Cleaner — Remove Nulls & Empty Values | JSON Hunt',
    description:
      'Clean JSON by removing null values, empty strings, arrays and objects. Free online JSON cleaner.',
  },
  '/tools/json-sorter': {
    title: 'JSON Sorter — Sort JSON Keys Alphabetically | JSON Hunt',
    description: 'Sort JSON object keys alphabetically, deeply. Free online JSON sorter.',
  },
  '/tools/json-schema-validator': {
    title: 'JSON Schema Validator — Validate Against a Schema | JSON Hunt',
    description: 'Validate JSON against a JSON Schema and see detailed errors. Free online JSON schema validator.',
  },
  '/tools/json-path-tester': {
    title: 'JSON Path Tester — Query JSON with JSONPath | JSON Hunt',
    description: 'Test JSONPath expressions against your JSON and preview matches. Free online JSON path tester.',
  },
  '/tools/json-schema-generator': {
    title: 'JSON Schema Generator — Infer a Schema from JSON | JSON Hunt',
    description: 'Generate a JSON Schema automatically from a sample JSON document. Free online JSON schema generator.',
  },
};

/**
 * Keeps title, meta description, canonical and Open Graph / Twitter tags
 * in sync with the active route. Wired once from AppComponent.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /** Subscribe to navigation and update head tags. Idempotent. */
  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.apply(e.urlAfterRedirects));
  }

  private apply(url: string): void {
    const path = normalizePath(url);
    const seo = ROUTE_SEO[path] ?? ROUTE_SEO[''];
    const canonical = `${SITE_URL}${path}`;

    this.title.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });

    this.setCanonical(canonical);

    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:image', content: DEFAULT_IMAGE });

    this.meta.updateTag({ name: 'twitter:title', content: seo.title });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.meta.updateTag({ name: 'twitter:image', content: DEFAULT_IMAGE });
  }

  private setCanonical(href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}

function normalizePath(url: string): string {
  const path = url.split(/[?#]/)[0];
  if (path === '/' || path === '') return '';
  return path.replace(/\/+$/, '');
}
