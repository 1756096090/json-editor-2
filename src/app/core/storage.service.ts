import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  read(key: string): string {
    const storage = this.getStorage();
    if (!storage) return '';
    try {
      return storage.getItem(key) ?? '';
    } catch {
      return '';
    }
  }

  write(key: string, value: string): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      if (value) storage.setItem(key, value);
      else storage.removeItem(key);
    } catch {
      // localStorage unavailable in private mode or restricted environments.
    }
  }

  readJson<T>(key: string): T | null {
    const raw = this.read(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  writeJson<T>(key: string, value: T): void {
    this.write(key, JSON.stringify(value));
  }

  private getStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }
}
