import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppHeaderComponent } from './components/ui/app-header/app-header.component';
import { AD_SLOTS_ENABLED, AdSlotComponent } from './components/ui/ad-slot/ad-slot.component';
import { SeoService } from './core/seo.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeaderComponent, AdSlotComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  /** Tool pages get a right-hand ad column (wide screens only, see ad-slot CSS). */
  readonly showToolSidebarAd = computed(
    () => AD_SLOTS_ENABLED && this.url().startsWith('/tools/')
  );

  constructor() {
    inject(SeoService).init();
  }
}
