import { Injectable } from '@angular/core';

/**
 * Centralized keyboard shortcut handling.
 * Provides a single source of truth for all keyboard bindings.
 */
@Injectable({ providedIn: 'root' })
export class KeyboardHandlerService {

  /**
   * Check if event is Ctrl+F / Cmd+F (find in editor)
   */
  isOpenFind(event: KeyboardEvent): boolean {
    const hasCommand = event.ctrlKey || event.metaKey;
    return hasCommand && !event.shiftKey && event.key.toLowerCase() === 'f';
  }

  /**
   * Check if event is Alt+ArrowUp (previous diff hunk)
   */
  isPrevHunk(event: KeyboardEvent): boolean {
    return event.altKey && (event.key === 'ArrowUp' || event.key === 'Up');
  }

  /**
   * Check if event is Alt+ArrowDown (next diff hunk)
   */
  isNextHunk(event: KeyboardEvent): boolean {
    return event.altKey && (event.key === 'ArrowDown' || event.key === 'Down');
  }

  /**
   * Check if event is Ctrl+Shift+F (format active panel) — GLOBAL
   */
  isFormatJson(event: KeyboardEvent): boolean {
    const hasCommand = event.ctrlKey || event.metaKey;
    // Note: Not using Ctrl+Shift+F globally to avoid Firefox conflict (search in page)
    // Format is triggered via toolbar button instead
    return false;
  }

  /**
   * Check if event is Ctrl+Shift+D (toggle diff)
   */
  isToggleDiff(event: KeyboardEvent): boolean {
    const hasCommand = event.ctrlKey || event.metaKey;
    return hasCommand && event.shiftKey && event.key.toLowerCase() === 'd';
  }

  /**
   * Check if event is Pause/Break (used on some tools)
   */
  isPause(event: KeyboardEvent): boolean {
    return event.key === 'Pause' || event.key === 'Break';
  }

  /**
   * Returns human-readable shortcut string
   */
  getShortcutLabel(shortcutKey: string, isMac: boolean = false): string {
    const map: Record<string, string> = {
      'openFind': isMac ? 'Cmd+F' : 'Ctrl+F',
      'prevHunk': 'Alt+↑',
      'nextHunk': 'Alt+↓',
      'toggleDiff': isMac ? 'Cmd+Shift+D' : 'Ctrl+Shift+D',
    };
    return map[shortcutKey] || shortcutKey;
  }
}
