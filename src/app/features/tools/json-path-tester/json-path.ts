/**
 * Minimal JSONPath evaluator — no external dependencies.
 * Supports: $ (root), .key, ..key (recursive), [n] (index), [*] (wildcard),
 * [-n] (negative index), [n,m] (union), [n:m] (slice), ['key'] (bracket notation).
 */

export interface PathResult {
  path: string;
  value: unknown;
}

export function evaluateJsonPath(root: unknown, expression: string): PathResult[] {
  const trimmed = expression.trim();
  if (!trimmed.startsWith('$')) {
    throw new Error('JSONPath expression must start with $');
  }
  const results: PathResult[] = [];
  evaluate(root, trimmed.slice(1), '$', results);
  return results;
}

function evaluate(node: unknown, expr: string, currentPath: string, results: PathResult[]): void {
  if (expr === '') {
    results.push({ path: currentPath, value: node });
    return;
  }

  // Recursive descent: ..key or ..[*]
  if (expr.startsWith('..')) {
    const rest = expr.slice(2);
    // Collect recursive descent on current node
    descendAll(node, rest, currentPath, results);
    return;
  }

  // Dot notation: .key or .*
  if (expr.startsWith('.')) {
    const rest = expr.slice(1);
    const [segment, remaining] = splitNextSegment(rest);

    if (segment === '*') {
      // Wildcard — all properties / items
      if (Array.isArray(node)) {
        node.forEach((item, i) => evaluate(item, remaining, `${currentPath}[${i}]`, results));
      } else if (isObject(node)) {
        Object.entries(node).forEach(([k, v]) => evaluate(v, remaining, `${currentPath}.${k}`, results));
      }
      return;
    }

    if (isObject(node) && segment in node) {
      evaluate(node[segment], remaining, `${currentPath}.${segment}`, results);
    }
    return;
  }

  // Bracket notation: [...]
  if (expr.startsWith('[')) {
    const closeIdx = expr.indexOf(']');
    if (closeIdx === -1) return;

    const inner = expr.slice(1, closeIdx).trim();
    const remaining = expr.slice(closeIdx + 1);

    // Quoted key: ['key'] or ["key"]
    if ((inner.startsWith("'") && inner.endsWith("'")) || (inner.startsWith('"') && inner.endsWith('"'))) {
      const key = inner.slice(1, -1);
      if (isObject(node) && key in node) {
        evaluate(node[key], remaining, `${currentPath}['${key}']`, results);
      }
      return;
    }

    // Wildcard: [*]
    if (inner === '*') {
      if (Array.isArray(node)) {
        node.forEach((item, i) => evaluate(item, remaining, `${currentPath}[${i}]`, results));
      } else if (isObject(node)) {
        Object.entries(node).forEach(([k, v]) => evaluate(v, remaining, `${currentPath}.${k}`, results));
      }
      return;
    }

    // Slice: [n:m] or [n:] or [:m]
    if (inner.includes(':')) {
      if (!Array.isArray(node)) return;
      const [startStr, endStr] = inner.split(':');
      const len = node.length;
      const start = startStr ? resolveIndex(parseInt(startStr, 10), len) : 0;
      const end   = endStr   ? resolveIndex(parseInt(endStr, 10),   len) : len;
      for (let i = start; i < end && i < len; i++) {
        evaluate(node[i], remaining, `${currentPath}[${i}]`, results);
      }
      return;
    }

    // Union: [0,1,2] or ['key1','key2']
    if (inner.includes(',')) {
      const parts = inner.split(',').map((s) => s.trim());
      for (const part of parts) {
        evaluate(node, `[${part}]${remaining}`, currentPath, results);
      }
      return;
    }

    // Single numeric index: [n] or [-n]
    const idx = parseInt(inner, 10);
    if (!isNaN(idx) && Array.isArray(node)) {
      const resolved = resolveIndex(idx, node.length);
      if (resolved >= 0 && resolved < node.length) {
        evaluate(node[resolved], remaining, `${currentPath}[${resolved}]`, results);
      }
      return;
    }

    // Plain key: [key] (no quotes)
    if (isObject(node) && inner in node) {
      evaluate(node[inner], remaining, `${currentPath}.${inner}`, results);
    }
    return;
  }
}

function descendAll(node: unknown, expr: string, currentPath: string, results: PathResult[]): void {
  // Apply expr to current node
  evaluate(node, expr.startsWith('[') ? expr : `.${expr}`, currentPath, results);

  // Recurse into children
  if (Array.isArray(node)) {
    node.forEach((item, i) => descendAll(item, expr, `${currentPath}[${i}]`, results));
  } else if (isObject(node)) {
    Object.entries(node).forEach(([k, v]) => descendAll(v, expr, `${currentPath}.${k}`, results));
  }
}

function splitNextSegment(expr: string): [string, string] {
  // Find the next . or [ that isn't inside quotes
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '.' || expr[i] === '[') {
      return [expr.slice(0, i), expr.slice(i)];
    }
  }
  return [expr, ''];
}

function resolveIndex(idx: number, len: number): number {
  return idx < 0 ? len + idx : idx;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
