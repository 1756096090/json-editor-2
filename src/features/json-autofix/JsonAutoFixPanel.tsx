import { tryAutoFixJson, type AutoFixJsonResult } from './autoFixJson';

export interface JsonAutoFixPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export function JsonAutoFixPanel(props: JsonAutoFixPanelProps): HTMLElement {
  let currentValue = props.value;

  const root = document.createElement('section');
  root.className = 'json-autofix-panel';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'json-autofix-panel__button';
  button.textContent = 'Reparar JSON';

  const status = document.createElement('p');
  status.className = 'json-autofix-panel__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const list = document.createElement('ul');
  list.className = 'json-autofix-panel__fixes';

  button.addEventListener('click', () => {
    const result = tryAutoFixJson(currentValue);
    renderResult(result);

    if (result.ok && !result.wasAlreadyValid) {
      currentValue = result.formattedText;
      props.onChange(result.formattedText);
    }
  });

  root.append(button, status, list);

  function renderResult(result: AutoFixJsonResult): void {
    list.replaceChildren();

    if (!result.ok) {
      status.textContent = `No se pudo reparar el JSON: ${result.reason}`;
      status.dataset['state'] = 'error';
      renderFixes(result.appliedFixes);
      return;
    }

    status.textContent = result.wasAlreadyValid
      ? 'El JSON ya es válido.'
      : 'JSON reparado correctamente.';
    status.dataset['state'] = 'success';
    renderFixes(result.appliedFixes);
  }

  function renderFixes(fixes: readonly string[]): void {
    if (fixes.length === 0) {
      const item = document.createElement('li');
      item.textContent = 'Sin correcciones aplicadas.';
      list.append(item);
      return;
    }

    for (const fix of fixes) {
      const item = document.createElement('li');
      item.textContent = fix;
      list.append(item);
    }
  }

  return root;
}
