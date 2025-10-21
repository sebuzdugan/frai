import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'url';

import { createScanner, scanCodebase } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXAMPLES_DIR = path.resolve(__dirname, '../../../../examples');

describe('scanCodebase', () => {
  it('detects AI libraries and functions in example projects', () => {
    const results = scanCodebase({ root: EXAMPLES_DIR });

    expect(results.totalFiles).toBeGreaterThan(0);
    expect(results.aiFiles.length).toBeGreaterThan(0);

    const libraryMatches = Object.values(results.aiLibraryMatches).flat();
    expect(libraryMatches.some((lib) => lib.includes('tensorflow'))).toBe(true);
  });

  it('supports custom detectors via createScanner', () => {
    const detectorInvocations = [];
    const customScanner = createScanner({
      detectors: [
        {
          id: 'custom',
          analyze({ filePath, content, result }) {
            if (content.includes('model')) {
              result.markAiFile(filePath);
              detectorInvocations.push(filePath);
            }
          }
        }
      ]
    });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'frai-scan-'));
    const filePath = path.join(tmpDir, 'mock.js');
    fs.writeFileSync(filePath, 'const model = {};');

    const results = customScanner({ root: tmpDir, extensions: ['.js'] });

    expect(results.aiFiles).toContain(filePath);
    expect(detectorInvocations).toContain(filePath);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
