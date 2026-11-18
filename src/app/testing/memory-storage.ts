/**
 * Test helper: in-memory localStorage. In this Vitest runner Node's
 * experimental global `localStorage` hides jsdom's and is unusable.
 */
class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  get length(): number { return this.items.size; }
  clear(): void { this.items.clear(); }
  getItem(key: string): string | null { return this.items.get(key) ?? null; }
  key(index: number): string | null { return [...this.items.keys()][index] ?? null; }
  removeItem(key: string): void { this.items.delete(key); }
  setItem(key: string, value: string): void { this.items.set(key, String(value)); }
}

/** Installs a fresh, empty localStorage on `window`. Call in `beforeEach`. */
export function useMemoryStorage(): void {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: new MemoryStorage(),
    writable: true,
  });
}
