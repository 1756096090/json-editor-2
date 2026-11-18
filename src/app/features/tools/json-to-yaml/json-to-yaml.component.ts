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
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-json-to-yaml',
  imports: [TranslatePipe, EditorTextComponent, ButtonComponent],
  templateUrl: './json-to-yaml.component.html',
  styleUrls: ['../tool-page.css', './json-to-yaml.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonToYamlComponent {
  protected readonly i18n = inject(I18nService);
  private readonly settings = inject(SettingsStore);

  readonly jsonInput = signal('{\n  "name": "json-we-format-angular",\n  "version": 1,\n  "active": true\n}');
  readonly yamlOutput = signal('');
  readonly errorMsg = signal('');
  readonly status = signal('');

  readonly monacoTheme = computed(() => this.settings.activeTheme());

  constructor() {
    inject(Title).setTitle('JSON to YAML Converter — Free Online Tool | JSON Hunt');
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
      this.errorMsg.set(this.i18n.t('yaml.invalid', { error }));
      this.yamlOutput.set('');
    } else {
      this.yamlOutput.set(yaml);
      this.errorMsg.set('');
      this.status.set(yaml ? this.i18n.t('yaml.converted') : '');
    }
  }

  copyYaml(): void {
    const yaml = this.yamlOutput();
    if (!yaml) return;
    navigator.clipboard.writeText(yaml).then(() => {
      this.status.set(this.i18n.t('yaml.copied'));
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
