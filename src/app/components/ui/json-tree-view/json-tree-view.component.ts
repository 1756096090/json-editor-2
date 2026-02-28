import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  signal
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface TreeNode {
  key: string;
  value: unknown;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  children: TreeNode[];
  depth: number;
  path: string;
}

@Component({
  selector: 'app-json-tree-view',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './json-tree-view.component.html',
  styleUrl: './json-tree-view.component.css'
})
export class JsonTreeViewComponent {
  readonly jsonValue = input<unknown>(null);

  readonly collapsedPaths = signal<Set<string>>(new Set());

  readonly rootNodes = computed(() => {
    const value = this.jsonValue();
    if (value === null || value === undefined) return [];
    return this.buildTree('root', value, 0, '$');
  });

  toggleNode(path: string): void {
    this.collapsedPaths.update(set => {
      const next = new Set(set);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  isCollapsed(path: string): boolean {
    return this.collapsedPaths().has(path);
  }

  collapseAll(): void {
    const paths = new Set<string>();
    this.collectCollapsiblePaths(this.rootNodes(), paths);
    this.collapsedPaths.set(paths);
  }

  expandAll(): void {
    this.collapsedPaths.set(new Set());
  }

  getTypeClass(type: string): string {
    return `tree-node__value--${type}`;
  }

  formatValue(node: TreeNode): string {
    if (node.type === 'string') return `"${node.value}"`;
    if (node.type === 'null') return 'null';
    return String(node.value);
  }

  getCollapsedSummary(node: TreeNode): string {
    if (node.type === 'object') return `{…} ${node.children.length} keys`;
    if (node.type === 'array') return `[…] ${node.children.length} items`;
    return '';
  }

  trackByPath(_index: number, node: TreeNode): string {
    return node.path;
  }

  private buildTree(key: string, value: unknown, depth: number, path: string): TreeNode[] {
    const type = this.getType(value);
    const node: TreeNode = { key, value, type, children: [], depth, path };

    if (type === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      node.children = Object.keys(obj).map(k =>
        this.buildTree(k, obj[k], depth + 1, `${path}.${k}`)[0]
      );
    } else if (type === 'array') {
      const arr = value as unknown[];
      node.children = arr.map((item, i) =>
        this.buildTree(String(i), item, depth + 1, `${path}[${i}]`)[0]
      );
    }

    return [node];
  }

  private getType(value: unknown): TreeNode['type'] {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    const t = typeof value;
    if (t === 'object') return 'object';
    if (t === 'string') return 'string';
    if (t === 'number') return 'number';
    if (t === 'boolean') return 'boolean';
    return 'string';
  }

  private collectCollapsiblePaths(nodes: TreeNode[], paths: Set<string>): void {
    for (const node of nodes) {
      if (node.children.length > 0) {
        paths.add(node.path);
        this.collectCollapsiblePaths(node.children, paths);
      }
    }
  }
}
