import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly draftKey = 'json-we-format:draft';

  loadDraft(): string {
    const storage = this.getStorage();
    if (!storage) {
      return '';
    }

    try {
      return storage.getItem(this.draftKey) ?? '';
    } catch {
      return '';
    }
  }

  saveDraft(value: string): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      if (value) {
        storage.setItem(this.draftKey, value);
        return;
      }

      storage.removeItem(this.draftKey);
    } catch {
      // localStorage can fail in private mode or restricted environments.
    }
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage;
  }
}
