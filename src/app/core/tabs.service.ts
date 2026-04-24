import { Injectable, effect, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

export interface Tab {
  id: string;
  label: string;
}

// ── Storage keys ──────────────────────────────────────────────────────────────
const LEFT_TABS_KEY  = 'json-we-format:left-tabs';
const RIGHT_TABS_KEY = 'json-we-format:right-tabs';
const LEFT_ACTIVE_KEY  = 'json-we-format:left-active';
const RIGHT_ACTIVE_KEY = 'json-we-format:right-active';

const leftContentKey  = (id: string) => `json-we-format:ltab:${id}`;
const rightContentKey = (id: string) => `json-we-format:rtab:${id}`;

// Legacy keys — used only during one-time migration
const LEGACY_TABS_KEY   = 'json-we-format:tabs';
const LEGACY_ACTIVE_KEY = 'json-we-format:active-tab';
const legacyTabLeftKey  = (id: string) => `json-we-format:tab:${id}:left`;
const legacyTabRightKey = (id: string) => `json-we-format:tab:${id}:right`;
const legacyTabKey      = (id: string) => `json-we-format:tab:${id}`;

@Injectable({ providedIn: 'root' })
export class TabsService {
  private readonly storage = inject(StorageService);

  private readonly _leftTabs  = signal<Tab[]>([]);
  private readonly _rightTabs = signal<Tab[]>([]);
  private readonly _leftActiveId  = signal<string>('');
  private readonly _rightActiveId = signal<string>('');

  readonly leftTabs  = this._leftTabs.asReadonly();
  readonly rightTabs = this._rightTabs.asReadonly();
  readonly leftActiveId  = this._leftActiveId.asReadonly();
  readonly rightActiveId = this._rightActiveId.asReadonly();

  constructor() {
    this.restore();
    effect(() => this.storage.writeJson(LEFT_TABS_KEY,  this._leftTabs()));
    effect(() => this.storage.writeJson(RIGHT_TABS_KEY, this._rightTabs()));
    effect(() => this.storage.write(LEFT_ACTIVE_KEY,  this._leftActiveId()));
    effect(() => this.storage.write(RIGHT_ACTIVE_KEY, this._rightActiveId()));
  }

  // ── Content accessors ────────────────────────────────────────────────────

  getLeftContent(tabId: string): string {
    return this.storage.read(leftContentKey(tabId));
  }

  getRightContent(tabId: string): string {
    return this.storage.read(rightContentKey(tabId));
  }

  saveLeftContent(tabId: string, content: string): void {
    this.storage.write(leftContentKey(tabId), content);
  }

  saveRightContent(tabId: string, content: string): void {
    this.storage.write(rightContentKey(tabId), content);
  }

  // ── Tab switching ────────────────────────────────────────────────────────

  /** Save `currentContent` to old tab, activate `newId`, return its stored content. */
  switchLeft(newId: string, currentContent: string): string {
    const oldId = this._leftActiveId();
    if (oldId === newId) return currentContent;
    this.saveLeftContent(oldId, currentContent);
    this._leftActiveId.set(newId);
    return this.getLeftContent(newId);
  }

  /** Save `currentContent` to old tab, activate `newId`, return its stored content. */
  switchRight(newId: string, currentContent: string): string {
    const oldId = this._rightActiveId();
    if (oldId === newId) return currentContent;
    this.saveRightContent(oldId, currentContent);
    this._rightActiveId.set(newId);
    return this.getRightContent(newId);
  }

  // ── Adding tabs ──────────────────────────────────────────────────────────

  /** Save `currentContent` to active left tab, create new tab, make it active. */
  addLeftTab(currentContent: string): Tab {
    this.saveLeftContent(this._leftActiveId(), currentContent);
    const id = crypto.randomUUID();
    const label = `Input ${this._leftTabs().length + 1}`;
    const tab: Tab = { id, label };
    this._leftTabs.update((ts) => [...ts, tab]);
    this._leftActiveId.set(id);
    return tab;
  }

  /** Save `currentContent` to active right tab, create new tab, make it active. */
  addRightTab(currentContent: string): Tab {
    this.saveRightContent(this._rightActiveId(), currentContent);
    const id = crypto.randomUUID();
    const label = `Output ${this._rightTabs().length + 1}`;
    const tab: Tab = { id, label };
    this._rightTabs.update((ts) => [...ts, tab]);
    this._rightActiveId.set(id);
    return tab;
  }

  // ── Closing tabs ─────────────────────────────────────────────────────────

  /** Close a left tab. Returns the new active tab's content if the active tab was closed. */
  closeLeftTab(id: string, currentContent: string): string | null {
    if (this._leftTabs().length <= 1) return null;
    const isActive = this._leftActiveId() === id;
    const idx = this._leftTabs().findIndex((t) => t.id === id);
    if (isActive) this.saveLeftContent(id, currentContent);
    this.storage.write(leftContentKey(id), '');
    this._leftTabs.update((ts) => ts.filter((t) => t.id !== id));
    if (isActive) {
      const next = this._leftTabs()[Math.min(idx, this._leftTabs().length - 1)];
      this._leftActiveId.set(next.id);
      return this.getLeftContent(next.id);
    }
    return null;
  }

  /** Close a right tab. Returns the new active tab's content if the active tab was closed. */
  closeRightTab(id: string, currentContent: string): string | null {
    if (this._rightTabs().length <= 1) return null;
    const isActive = this._rightActiveId() === id;
    const idx = this._rightTabs().findIndex((t) => t.id === id);
    if (isActive) this.saveRightContent(id, currentContent);
    this.storage.write(rightContentKey(id), '');
    this._rightTabs.update((ts) => ts.filter((t) => t.id !== id));
    if (isActive) {
      const next = this._rightTabs()[Math.min(idx, this._rightTabs().length - 1)];
      this._rightActiveId.set(next.id);
      return this.getRightContent(next.id);
    }
    return null;
  }

  // ── Rename ───────────────────────────────────────────────────────────────

  renameLeftTab(id: string, label: string): void {
    this._leftTabs.update((ts) => ts.map((t) => (t.id === id ? { ...t, label } : t)));
  }

  renameRightTab(id: string, label: string): void {
    this._rightTabs.update((ts) => ts.map((t) => (t.id === id ? { ...t, label } : t)));
  }

  // ── Swap ──────────────────────────────────────────────────────────────

  swapTabs(): void {
    // Swap tabs arrays
    const tempTabs = this._leftTabs();
    const tempActiveId = this._leftActiveId();

    this._leftTabs.set(this._rightTabs());
    this._leftActiveId.set(this._rightActiveId());

    this._rightTabs.set(tempTabs);
    this._rightActiveId.set(tempActiveId);

    // Also swap all stored contents
    const leftTabs = this._leftTabs();
    const rightTabs = this._rightTabs();

    // Save left contents with right keys and vice versa
    for (const tab of leftTabs) {
      const content = this.storage.read(rightContentKey(tab.id));
      this.storage.write(leftContentKey(tab.id), content);
    }

    for (const tab of rightTabs) {
      const content = this.storage.read(leftContentKey(tab.id));
      this.storage.write(rightContentKey(tab.id), content);
    }
  }

  // ── Restore ──────────────────────────────────────────────────────────────

  private restore(): void {
    const savedLeft = this.storage.readJson<Tab[]>(LEFT_TABS_KEY);

    if (savedLeft && savedLeft.length > 0) {
      // New format exists — restore directly
      this._leftTabs.set(savedLeft);
      const lActive = this.storage.read(LEFT_ACTIVE_KEY);
      this._leftActiveId.set(savedLeft.some((t) => t.id === lActive) ? lActive : savedLeft[0].id);

      const savedRight = this.storage.readJson<Tab[]>(RIGHT_TABS_KEY);
      if (savedRight && savedRight.length > 0) {
        this._rightTabs.set(savedRight);
        const rActive = this.storage.read(RIGHT_ACTIVE_KEY);
        this._rightActiveId.set(savedRight.some((t) => t.id === rActive) ? rActive : savedRight[0].id);
      } else {
        const rt: Tab = { id: crypto.randomUUID(), label: 'Output 1' };
        this._rightTabs.set([rt]);
        this._rightActiveId.set(rt.id);
      }
      return;
    }

    // Check for legacy data to migrate
    const legacyTabs = this.storage.readJson<Tab[]>(LEGACY_TABS_KEY);
    if (legacyTabs && legacyTabs.length > 0) {
      this.migrateLegacy(legacyTabs);
      return;
    }

    // Fresh start
    const lt: Tab = { id: crypto.randomUUID(), label: 'Input 1' };
    const rt: Tab = { id: crypto.randomUUID(), label: 'Output 1' };
    this._leftTabs.set([lt]);
    this._leftActiveId.set(lt.id);
    this._rightTabs.set([rt]);
    this._rightActiveId.set(rt.id);
  }

  private migrateLegacy(legacyTabs: Tab[]): void {
    const legacyActive = this.storage.read(LEGACY_ACTIVE_KEY);

    // Migrate left content for each old tab
    const leftTabs: Tab[] = legacyTabs.map((t, i) => ({ id: t.id, label: `Input ${i + 1}` }));
    for (const t of legacyTabs) {
      const content = this.storage.read(legacyTabLeftKey(t.id))
        || this.storage.read(legacyTabKey(t.id));
      if (content) this.storage.write(leftContentKey(t.id), content);
    }

    this._leftTabs.set(leftTabs);
    const lExists = leftTabs.some((t) => t.id === legacyActive);
    this._leftActiveId.set(lExists ? legacyActive : leftTabs[0].id);

    // For the right panel, take the active tab's right content
    const activeId = lExists ? legacyActive : leftTabs[0].id;
    const rightContent = this.storage.read(legacyTabRightKey(activeId));
    const rt: Tab = { id: crypto.randomUUID(), label: 'Output 1' };
    if (rightContent) this.storage.write(rightContentKey(rt.id), rightContent);
    this._rightTabs.set([rt]);
    this._rightActiveId.set(rt.id);

    // Clean up legacy keys
    this.storage.write(LEGACY_TABS_KEY, '');
    this.storage.write(LEGACY_ACTIVE_KEY, '');
    for (const t of legacyTabs) {
      this.storage.write(legacyTabLeftKey(t.id), '');
      this.storage.write(legacyTabRightKey(t.id), '');
      this.storage.write(legacyTabKey(t.id), '');
    }
  }
}
