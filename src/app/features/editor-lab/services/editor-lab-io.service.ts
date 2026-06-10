import { Injectable } from '@angular/core';
import {
  copyTextToClipboard,
  downloadTextFile,
  readFileAsText,
  readTextFromClipboard,
} from '../../json-workbench/utils/file-utils';

export interface IoOperationResult {
  ok: boolean;
  value?: string;
  fileName?: string;
  error?: string;
}

/**
 * Format-agnostic I/O operations for the editor-lab.
 * Wraps file-utils.ts without coupling to any specific store.
 */
@Injectable({ providedIn: 'root' })
export class EditorLabIoService {

  async copyToClipboard(text: string): Promise<IoOperationResult> {
    try {
      await copyTextToClipboard(text);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.toMessage(error) };
    }
  }

  async pasteFromClipboard(): Promise<IoOperationResult> {
    try {
      const value = await readTextFromClipboard();
      return { ok: true, value };
    } catch (error) {
      return { ok: false, error: this.toMessage(error) };
    }
  }

  download(fileName: string, content: string, mimeType: string): void {
    downloadTextFile(fileName, content, mimeType);
  }

  async openFilePicker(accept: string): Promise<IoOperationResult> {
    try {
      const file = await this.pickFile(accept);
      const value = await readFileAsText(file);
      return { ok: true, value, fileName: file.name };
    } catch (error) {
      return { ok: false, error: this.toMessage(error) };
    }
  }

  async loadFile(file: File): Promise<IoOperationResult> {
    try {
      const value = await readFileAsText(file);
      return { ok: true, value, fileName: file.name };
    } catch (error) {
      return { ok: false, error: this.toMessage(error) };
    }
  }

  async loadFromUrl(rawUrl: string): Promise<IoOperationResult> {
    const url = this.parseHttpUrl(rawUrl);
    if (!url) {
      return { ok: false, error: 'Invalid URL — must start with http:// or https://' };
    }

    try {
      const response = await fetch(rawUrl);
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      const value = await response.text();
      return { ok: true, value, fileName: url.hostname + url.pathname };
    } catch (error) {
      return { ok: false, error: this.toMessage(error) };
    }
  }

  private pickFile(accept: string): Promise<File> {
    return new Promise<File>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      let settled = false;

      const cleanUp = (): void => {
        window.removeEventListener('focus', onWindowFocus);
        input.remove();
      };

      const onWindowFocus = (): void => {
        window.setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanUp();
          reject(new Error('File selection was canceled.'));
        }, 300);
      };

      input.addEventListener('change', () => {
        if (settled) return;
        settled = true;
        const file = input.files?.item(0);
        cleanUp();
        if (!file) {
          reject(new Error('No file selected.'));
          return;
        }
        resolve(file);
      });

      window.addEventListener('focus', onWindowFocus, { once: true });
      input.click();
    });
  }

  private parseHttpUrl(rawUrl: string): URL | null {
    try {
      const url = new URL(rawUrl);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
    } catch {
      return null;
    }
  }

  private toMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error.';
  }
}
