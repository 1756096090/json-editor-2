import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input
} from '@angular/core';

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableRow {
  [key: string]: unknown;
}

@Component({
  selector: 'app-json-table-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './json-table-view.component.html',
  styleUrl: './json-table-view.component.css'
})
export class JsonTableViewComponent {
  readonly jsonValue = input<unknown>(null);

  readonly isArray = computed(() => Array.isArray(this.jsonValue()));

  readonly columns = computed<TableColumn[]>(() => {
    const value = this.jsonValue();
    if (!Array.isArray(value)) return this.objectColumns(value);

    const keySet = new Set<string>();
    for (const item of value) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        for (const key of Object.keys(item as Record<string, unknown>)) {
          keySet.add(key);
        }
      }
    }

    if (keySet.size === 0) {
      return [{ key: '__value__', label: 'Value' }];
    }

    return Array.from(keySet).map(key => ({ key, label: key }));
  });

  readonly rows = computed<TableRow[]>(() => {
    const value = this.jsonValue();
    if (!Array.isArray(value)) return this.objectRows(value);

    return value.map((item, index) => {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        return { __index__: index, ...(item as Record<string, unknown>) };
      }
      return { __index__: index, __value__: item };
    });
  });

  readonly isEmpty = computed(() => {
    const value = this.jsonValue();
    return value === null || value === undefined;
  });

  readonly emptyMessage = computed(() => {
    const value = this.jsonValue();
    if (value === null || value === undefined) return 'No data to display';
    if (Array.isArray(value) && value.length === 0) return 'Empty array';
    return '';
  });

  formatCell(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  getCellTypeClass(value: unknown): string {
    if (value === null) return 'table-view__cell--null';
    if (typeof value === 'string') return 'table-view__cell--string';
    if (typeof value === 'number') return 'table-view__cell--number';
    if (typeof value === 'boolean') return 'table-view__cell--boolean';
    if (typeof value === 'object') return 'table-view__cell--object';
    return '';
  }

  trackByKey(_index: number, col: TableColumn): string {
    return col.key;
  }

  trackByIndex(index: number): number {
    return index;
  }

  private objectColumns(value: unknown): TableColumn[] {
    if (value === null || value === undefined || typeof value !== 'object') return [];
    return [
      { key: '__key__', label: 'Key' },
      { key: '__value__', label: 'Value' }
    ];
  }

  private objectRows(value: unknown): TableRow[] {
    if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) return [];
    return Object.entries(value as Record<string, unknown>).map(([key, val], index) => ({
      __index__: index,
      __key__: key,
      __value__: val
    }));
  }
}
