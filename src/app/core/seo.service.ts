import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { I18nService } from './i18n/i18n.service';
import type { TranslationKey } from './i18n/en';

export const SITE_URL = 'https://jsonworkbench.dev';
const DEFAULT_IMAGE = `${SITE_URL}/assets/og-image.png`;

interface RouteSeo {
  title: TranslationKey;
  description: TranslationKey;
}

/** Per-route metadata (translation keys). Keys are normalized paths without trailing slash. */
const ROUTE_SEO: Record<string, RouteSeo> = {
  '': { title: 'seo.home.title', description: 'seo.home.desc' },
  '/workbench': { title: 'seo.workbench.title', description: 'seo.workbench.desc' },
  '/editor-lab': { title: 'seo.editorLab.title', description: 'seo.editorLab.desc' },
  '/tools/json-formatter': { title: 'seo.formatter.title', description: 'seo.formatter.desc' },
  '/tools/json-validator': { title: 'seo.validator.title', description: 'seo.validator.desc' },
  '/tools/json-error-finder': { title: 'seo.errorFinder.title', description: 'seo.errorFinder.desc' },
  '/tools/json-viewer': { title: 'seo.viewer.title', description: 'seo.viewer.desc' },
  '/tools/json-compare': { title: 'seo.compare.title', description: 'seo.compare.desc' },
  '/tools/json-minifier': { title: 'seo.minifier.title', description: 'seo.minifier.desc' },
  '/tools/json-to-yaml': { title: 'seo.toYaml.title', description: 'seo.toYaml.desc' },
  '/tools/json-to-csv': { title: 'seo.toCsv.title', description: 'seo.toCsv.desc' },
  '/tools/json-to-xml': { title: 'seo.toXml.title', description: 'seo.toXml.desc' },
  '/tools/json-cleaner': { title: 'seo.cleaner.title', description: 'seo.cleaner.desc' },
  '/tools/json-sorter': { title: 'seo.sorter.title', description: 'seo.sorter.desc' },
  '/tools/json-schema-validator': { title: 'seo.schemaValidator.title', description: 'seo.schemaValidator.desc' },
  '/tools/json-path-tester': { title: 'seo.pathTester.title', description: 'seo.pathTester.desc' },
  '/tools/json-schema-generator': { title: 'seo.schemaGenerator.title', description: 'seo.schemaGenerator.desc' },
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
  private readonly i18n = inject(I18nService);
  private readonly currentUrl = signal<string | null>(null);

  constructor() {
    // Re-apply on navigation and whenever the UI language changes.
    effect(() => {
      const url = this.currentUrl();
      this.i18n.lang();
      if (url !== null) this.apply(url);
    });
  }

  /** Subscribe to navigation and update head tags. Idempotent. */
  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.currentUrl.set(e.urlAfterRedirects));
  }

  private apply(url: string): void {
    const path = normalizePath(url);
    const keys = ROUTE_SEO[path] ?? ROUTE_SEO[''];
    const seo = { title: this.i18n.t(keys.title), description: this.i18n.t(keys.description) };
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
