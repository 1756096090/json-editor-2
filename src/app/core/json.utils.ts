export type ParseResult<T = unknown> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: Error;
    };

export function safeParse<T = unknown>(value: string): ParseResult<T> {
  try {
    return {
      ok: true,
      value: JSON.parse(value) as T
    };
  } catch (error) {
    return {
      ok: false,
      error: toError(error)
    };
  }
}

export function format(value: string, spaces = 2): string {
  return JSON.stringify(JSON.parse(value), null, spaces);
}

export function minify(value: string): string {
  return JSON.stringify(JSON.parse(value));
}

export function downloadBlob(filename: string, content: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === 'string') {
    return new Error(value);
  }

  return new Error('Unknown JSON parse error');
}
