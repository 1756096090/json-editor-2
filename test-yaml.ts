// Quick test for YAML conversion
import { jsonToYaml } from './src/app/features/tools/json-to-yaml/json-yaml.utils';

const testData = { name: 'test', value: 123 };

try {
  const result = jsonToYaml(testData);
  console.log('YAML Result:', result);
  console.log('Length:', result.length);
} catch (e) {
  console.error('YAML Error:', e);
}
