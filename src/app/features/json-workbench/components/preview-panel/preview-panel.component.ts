import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  computed,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import JSONEditor from 'jsoneditor';
import type { JSONEditorOptions } from 'jsoneditor';
import { JsonValue, PreviewMode } from '../../state/workbench.store';

interface TableRow {
  path: string;
  type: string;
  value: string;
}

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  templateUrl: './preview-panel.component.html',
  styleUrl: './preview-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PreviewPanelComponent implements OnDestroy {
  readonly jsonValue = input<JsonValue | null>(null);
  readonly previewMode = input<PreviewMode>('tree');

  readonly previewModeChange = output<PreviewMode>();
  readonly previewJsonChange = output<JsonValue>();

  private jsonEditorHost?: ElementRef<HTMLDivElement>;
  private editor: JSONEditor | null = null;
  private suppressEditorChange = false;

  private readonly hostReady = signal(false);

  @ViewChild('jsonEditorHost')
  set jsonEditorHostRef(host: ElementRef<HTMLDivElement> | undefined) {
    this.jsonEditorHost = host;
    this.hostReady.set(Boolean(host));
  }

  readonly hasData = computed(() => this.jsonValue() !== null);
  readonly prettyText = computed(() => {
    const value = this.jsonValue();
    return value === null ? '' : JSON.stringify(value, null, 2);
  });
  readonly tableRows = computed<TableRow[]>(() => buildTableRows(this.jsonValue()));

  constructor() {
    effect(() => {
      const mode = this.previewMode();
      const value = this.jsonValue();
      const hostReady = this.hostReady();

      if (mode !== 'tree' || value === null || !hostReady) {
        this.destroyEditor();
        return;
      }

      this.ensureEditor();
      this.writeEditorValue(value);
    });
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }

  setMode(mode: PreviewMode): void {
    this.previewModeChange.emit(mode);
  }

  private ensureEditor(): void {
    if (this.editor || !this.jsonEditorHost) {
      return;
    }

    const options: JSONEditorOptions = {
      mode: 'tree',
      mainMenuBar: false,
      navigationBar: true,
      statusBar: true,
      onChange: () => {
        if (!this.editor || this.suppressEditorChange) {
          return;
        }

        try {
          this.previewJsonChange.emit(this.editor.get() as JsonValue);
        } catch {
          // Ignore invalid partial edits in the tree editor.
        }
      }
    };

    this.editor = new JSONEditor(this.jsonEditorHost.nativeElement, options);
  }

  private writeEditorValue(value: JsonValue): void {
    if (!this.editor) {
      return;
    }

    this.suppressEditorChange = true;
    try {
      this.editor.update(value as never);
    } finally {
      this.suppressEditorChange = false;
    }
  }

  private destroyEditor(): void {
    if (!this.editor) {
      return;
    }

    this.editor.destroy();
    this.editor = null;
  }
}

function buildTableRows(value: JsonValue | null): TableRow[] {
  if (value === null) {
    return [];
  }

  const rows: TableRow[] = [];
  walkJson(value, '$', rows);
  return rows;
}

function walkJson(value: JsonValue, path: string, rows: TableRow[]): void {
  if (Array.isArray(value)) {
    rows.push({ path, type: 'array', value: `${value.length} item(s)` });
    for (let index = 0; index < value.length; index += 1) {
      walkJson(value[index], `${path}[${index}]`, rows);
    }
    return;
  }

  if (isObject(value)) {
    const keys = Object.keys(value);
    rows.push({ path, type: 'object', value: `${keys.length} key(s)` });
    for (const key of keys) {
      walkJson(value[key], `${path}.${key}`, rows);
    }
    return;
  }

  rows.push({
    path,
    type: value === null ? 'null' : typeof value,
    value: value === null ? 'null' : String(value)
  });
}

function isObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
