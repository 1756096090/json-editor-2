import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

export interface RecentDoc {
  id: string;
  label: string;
  content: string;
  savedAt: number;
  sizeBytes: number;
}

const STORAGE_KEY = 'json-we-format:recent-docs';
const MAX_DOCS = 10;

@Injectable({
  providedIn: 'root',
})
export class RecentDocsService {
  private readonly storage = inject(StorageService);
  private readonly _docs = signal<RecentDoc[]>(
    this.storage.readJson<RecentDoc[]>(STORAGE_KEY) ?? []
  );

  readonly docs = this._docs.asReadonly();

  push(label: string, content: string): void {
    const id = this.hashContent(content);
    const entry: RecentDoc = {
      id,
      label,
      content,
      savedAt: Date.now(),
      sizeBytes: new TextEncoder().encode(content).length,
    };
    const next = [entry, ...this._docs().filter((d) => d.id !== id)].slice(0, MAX_DOCS);
    this.persist(next);
  }

  remove(id: string): void {
    this.persist(this._docs().filter((d) => d.id !== id));
  }

  clear(): void {
    this.persist([]);
  }

  private persist(docs: RecentDoc[]): void {
    this._docs.set(docs);
    this.storage.writeJson(STORAGE_KEY, docs);
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (Math.imul(31, hash) + content.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16);
  }
}
