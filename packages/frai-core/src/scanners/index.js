import fs from 'fs';
import path from 'path';

import {
  DEFAULT_CODE_EXTENSIONS,
  DEFAULT_EXCLUDED_DIRS
} from './constants.js';
import { DEFAULT_DETECTORS } from './detectors.js';

const defaultConfig = {
  root: process.cwd(),
  excludedDirs: DEFAULT_EXCLUDED_DIRS,
  extensions: DEFAULT_CODE_EXTENSIONS,
  detectors: DEFAULT_DETECTORS,
  fs
};

const shouldSkip = (name, excluded) => excluded.includes(name);

const createResult = () => {
  const result = {
    aiFiles: [],
    totalFiles: 0,
    aiLibraryMatches: {},
    aiFunctionMatches: {}
  };

  const aiSet = new Set();
  result.markAiFile = (filePath) => {
    if (!aiSet.has(filePath)) {
      aiSet.add(filePath);
      result.aiFiles.push(filePath);
    }
  };

  return result;
};

export function scanCodebase(options = {}) {
  const config = { ...defaultConfig, ...options };
  const {
    root,
    excludedDirs,
    extensions,
    detectors,
    fs: fsModule
  } = config;

  const result = createResult();

  function scanDirectory(dir) {
    let entries;
    try {
      entries = fsModule.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      console.error(`Error scanning directory ${dir}: ${error.message}`);
      return;
    }

    for (const entry of entries) {
      if (shouldSkip(entry.name, excludedDirs)) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!extensions.includes(ext)) continue;

        result.totalFiles += 1;
        let content;
        try {
          content = fsModule.readFileSync(fullPath, 'utf8');
        } catch (error) {
          console.error(`Error reading file ${fullPath}: ${error.message}`);
          continue;
        }

        for (const detector of detectors) {
          try {
            detector.analyze({
              filePath: fullPath,
              content,
              result,
              config
            });
          } catch (error) {
            console.error(`Detector ${detector.id || 'unknown'} failed on ${fullPath}: ${error.message}`);
          }
        }
      }
    }
  }

  scanDirectory(root);

  return {
    aiFiles: result.aiFiles,
    totalFiles: result.totalFiles,
    aiLibraryMatches: result.aiLibraryMatches,
    aiFunctionMatches: result.aiFunctionMatches
  };
}

export function createScanner(config = {}) {
  return (overrides = {}) => scanCodebase({ ...config, ...overrides });
}

export { DEFAULT_DETECTORS } from './detectors.js';
export {
  DEFAULT_CODE_EXTENSIONS,
  DEFAULT_EXCLUDED_DIRS
} from './constants.js';
