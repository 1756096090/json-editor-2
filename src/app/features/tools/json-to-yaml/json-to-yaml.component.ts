import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { EditorTextComponent } from '../../json-workbench/components/editor-text/editor-text.component';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { SettingsStore } from '../../settings/settings.store';
import { convertJsonToYaml } from './json-yaml.utils';

@Component({
  selector: 'app-json-to-yaml',
  imports: [EditorTextComponent, ButtonComponent],
  template: `
    <div class="tool-page">
      <div class="tool-page__intro">
        <h1 class="tool-page__title">JSON to YAML</h1>
        <p class="tool-page__subtitle">
          Convert any JSON document to clean, readable YAML in one click.
          Perfect for Kubernetes configs, CI pipelines and infrastructure files.
        </p>
      </div>

      <div class="yaml-workspace">
        <!-- Toolbar -->
        <div class="yaml-toolbar" role="toolbar" aria-label="JSON to YAML actions">
          <app-ui-button size="sm" variant="accent" (pressed)="convert()">
            Convert →
          </app-ui-button>

          <div class="yaml-toolbar__sep" aria-hidden="true"></div>

          <app-ui-button
            size="sm"
            variant="ghost"
            [disabled]="!yamlOutput()"
            (pressed)="copyYaml()"
          >Copy YAML</app-ui-button>

          <app-ui-button
            size="sm"
            variant="ghost"
            [disabled]="!yamlOutput()"
            (pressed)="downloadYaml()"
          >Download .yaml</app-ui-button>

          @if (errorMsg()) {
            <span class="yaml-toolbar__error" role="alert">{{ errorMsg() }}</span>
          } @else if (status()) {
            <span class="yaml-toolbar__status" aria-live="polite">{{ status() }}</span>
          }
        </div>

        <!-- Panels -->
        <div class="yaml-panels">
          <!-- Left: JSON input -->
          <div class="yaml-panel">
            <div class="yaml-panel__header">
              <h2 class="yaml-panel__title">JSON Input</h2>
            </div>
            <div class="yaml-panel__body">
              <app-editor-text
                language="json"
                [value]="jsonInput()"
                [theme]="monacoTheme()"
                ariaLabel="JSON input editor"
                (valueChange)="onJsonChange($event)"
              />
            </div>
          </div>

          <!-- Right: YAML output (read-only) -->
          <div class="yaml-panel">
            <div class="yaml-panel__header">
              <h2 class="yaml-panel__title">YAML Output</h2>
            </div>
            <div class="yaml-panel__body">
              <app-editor-text
                language="yaml"
                [value]="yamlOutput()"
                [readOnly]="true"
                [theme]="monacoTheme()"
                ariaLabel="YAML output (read-only)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../tool-page.css', './json-to-yaml.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonToYamlComponent {
  private readonly settings = inject(SettingsStore);

  readonly jsonInput = signal('{\n  "name": "json-we-format-angular",\n  "version": 1,\n  "active": true\n}');
  readonly yamlOutput = signal('');
  readonly errorMsg = signal('');
  readonly status = signal('');

  readonly monacoTheme = computed(() =>
    this.settings.themeMode() === 'dark' ? 'dark' : 'light'
  );

  constructor() {
    inject(Title).setTitle('JSON to YAML Converter — Free Online Tool | JSONScan');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Convert JSON to clean, readable YAML in one click. Perfect for Kubernetes, CI/CD and infrastructure configs. Free online JSON to YAML converter.',
    });
    // Auto-convert the default JSON on load
    this.convert();
  }

  onJsonChange(text: string): void {
    this.jsonInput.set(text);
    this.status.set('');
    this.errorMsg.set('');
  }

  convert(): void {
    const { yaml, error } = convertJsonToYaml(this.jsonInput());
    if (error) {
      this.errorMsg.set(`Invalid JSON: ${error}`);
      this.yamlOutput.set('');
    } else {
      this.yamlOutput.set(yaml);
      this.errorMsg.set('');
      this.status.set(yaml ? 'Converted successfully' : '');
    }
  }

  copyYaml(): void {
    const yaml = this.yamlOutput();
    if (!yaml) return;
    navigator.clipboard.writeText(yaml).then(() => {
      this.status.set('YAML copied!');
      setTimeout(() => this.status.set(''), 2000);
    });
  }

  downloadYaml(): void {
    const yaml = this.yamlOutput();
    if (!yaml) return;
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.yaml';
    a.click();
    URL.revokeObjectURL(url);
  }
}
