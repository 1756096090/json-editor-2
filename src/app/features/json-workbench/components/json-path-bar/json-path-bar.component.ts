import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../../../components/ui/icon/icon.component';
import {
  formatPathDots,
  formatPathJava,
  formatPathJs,
  formatPathJsSafe,
  formatPathPython,
  getJsonPathAtOffset,
  type JsonPathSegment,
} from '../../utils/json-path-inspector';
import { copyTextToClipboard } from '../../utils/file-utils';

type PathFlavor = 'dots' | 'js' | 'js-safe' | 'python' | 'java';

@Component({
  selector: 'app-json-path-bar',
  imports: [IconComponent],
  templateUrl: './json-path-bar.component.html',
  styleUrl: './json-path-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonPathBarComponent {
  /** Current JSON text in the editor. */
  readonly text = input<string>('');
  /** Character offset of the cursor, or null when unknown. */
  readonly cursorOffset = input<number | null>(null);

  /** Emits a short status message when a path is copied. */
  readonly statusMessage = output<string>();

  private readonly path = computed<JsonPathSegment[] | null>(() => {
    const offset = this.cursorOffset();
    if (offset === null) return null;
    return getJsonPathAtOffset(this.text(), offset);
  });

  /** True when the text is non-empty but does not parse as JSON. */
  readonly isInvalidJson = computed<boolean>(() => {
    if (this.text().trim() === '') return false;
    try {
      JSON.parse(this.text());
      return false;
    } catch {
      return true;
    }
  });

  readonly hasPath = computed<boolean>(() => {
    const p = this.path();
    return p !== null && p.length > 0;
  });

  readonly dotsPath = computed<string>(() => {
    const p = this.path();
    return p && p.length > 0 ? formatPathDots(p) : '';
  });

  private readonly clipboardWriter = copyTextToClipboard;

  async copy(flavor: PathFlavor): Promise<void> {
    const p = this.path();
    if (!p || p.length === 0) return;

    const value = this.formatFor(flavor, p);
    const label = this.labelFor(flavor);
    try {
      await this.clipboardWriter(value);
      this.statusMessage.emit(`${label} path copied.`);
    } catch {
      this.statusMessage.emit('Copy failed.');
    }
  }

  private formatFor(flavor: PathFlavor, p: JsonPathSegment[]): string {
    switch (flavor) {
      case 'dots': return formatPathDots(p);
      case 'js': return formatPathJs(p);
      case 'js-safe': return formatPathJsSafe(p);
      case 'python': return formatPathPython(p);
      case 'java': return formatPathJava(p);
    }
  }

  private labelFor(flavor: PathFlavor): string {
    switch (flavor) {
      case 'dots': return 'Path';
      case 'js': return 'JS';
      case 'js-safe': return 'JS safe';
      case 'python': return 'Python';
      case 'java': return 'Java';
    }
  }
}
