export interface OpenedJsonFile {
  fileName: string;
  content: string;
}

export async function openJsonFilePicker(): Promise<OpenedJsonFile> {
  const file = await pickJsonFile();
  const content = await readFileAsText(file);

  return {
    fileName: file.name,
    content
  };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Unable to read file.'));
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsText(file);
    } catch (error) {
      reject(error);
    }
  });
}

export type TextFileEncoding = 'UTF-8' | 'UTF-16LE' | 'UTF-16BE' | 'ISO-8859-1' | 'Windows-1252';

const WINDOWS_1252_DECODE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType = 'application/json',
  encoding: TextFileEncoding = 'UTF-8',
): void {
  const blob = new Blob([encodeText(content, encoding)], {
    type: `${mimeType};charset=${encoding.toLowerCase()}`,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function encodeText(content: string, encoding: TextFileEncoding): BlobPart {
  if (encoding === 'UTF-8') {
    return toArrayBuffer(new TextEncoder().encode(content));
  }

  if (encoding === 'UTF-16LE' || encoding === 'UTF-16BE') {
    return toArrayBuffer(encodeUtf16(content, encoding === 'UTF-16LE'));
  }

  return toArrayBuffer(encodeSingleByte(content, encoding));
}

function encodeUtf16(content: string, littleEndian: boolean): Uint8Array {
  const bytes = new Uint8Array(2 + content.length * 2);
  bytes[0] = littleEndian ? 0xff : 0xfe;
  bytes[1] = littleEndian ? 0xfe : 0xff;

  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    const offset = 2 + i * 2;
    bytes[offset] = littleEndian ? code & 0xff : code >> 8;
    bytes[offset + 1] = littleEndian ? code >> 8 : code & 0xff;
  }

  return bytes;
}

function encodeSingleByte(content: string, encoding: 'ISO-8859-1' | 'Windows-1252'): Uint8Array {
  const bytes = new Uint8Array(content.length);
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code <= 0xff) {
      bytes[i] = code;
    } else if (encoding === 'Windows-1252' && WINDOWS_1252_DECODE[code]) {
      bytes[i] = WINDOWS_1252_DECODE[code];
    } else {
      bytes[i] = 0x3f;
    }
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const output = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(output).set(bytes);
  return output;
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('Clipboard API is not available in this browser.');
  }

  await navigator.clipboard.writeText(text);
}

export async function readTextFromClipboard(): Promise<string> {
  if (!navigator.clipboard) {
    throw new Error('Clipboard API is not available in this browser.');
  }

  return navigator.clipboard.readText();
}

function pickJsonFile(): Promise<File> {
  return new Promise<File>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/json';
    let settled = false;

    const cleanUp = (): void => {
      window.removeEventListener('focus', onWindowFocus);
      input.remove();
    };

    const onWindowFocus = (): void => {
      window.setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        cleanUp();
        reject(new Error('File selection was canceled.'));
      }, 0);
    };

    input.addEventListener('change', () => {
      if (settled) {
        return;
      }

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
