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

export function downloadTextFile(fileName: string, content: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
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
