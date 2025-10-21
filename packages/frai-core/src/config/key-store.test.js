import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  getGlobalApiKey,
  getLocalApiKey,
  hasGlobalApiKey,
  hasLocalApiKey,
  setGlobalApiKey,
  setLocalApiKey
} from './key-store.js';
import { resolveGlobalConfigPath, resolveLocalEnvPath } from './paths.js';

describe('config key store', () => {
  let tmpCwd;
  let tmpHome;

  beforeEach(() => {
    tmpCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'frai-cwd-'));
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'frai-home-'));
  });

  afterEach(() => {
    fs.rmSync(tmpCwd, { recursive: true, force: true });
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('handles local env api key lifecycle', () => {
    expect(hasLocalApiKey(tmpCwd)).toBe(false);
    expect(getLocalApiKey(tmpCwd)).toBeNull();

    setLocalApiKey('test-key', tmpCwd);

    expect(hasLocalApiKey(tmpCwd)).toBe(true);
    expect(getLocalApiKey(tmpCwd)).toBe('test-key');

    const envPath = resolveLocalEnvPath(tmpCwd);
    const content = fs.readFileSync(envPath, 'utf8');
    expect(content).toContain('OPENAI_API_KEY=test-key');
  });

  it('handles global config api key lifecycle', () => {
    expect(hasGlobalApiKey(tmpHome)).toBe(false);
    expect(getGlobalApiKey(tmpHome)).toBeNull();

    setGlobalApiKey('global-key', tmpHome);

    expect(hasGlobalApiKey(tmpHome)).toBe(true);
    expect(getGlobalApiKey(tmpHome)).toBe('global-key');

    const configPath = resolveGlobalConfigPath(tmpHome);
    const content = fs.readFileSync(configPath, 'utf8');
    expect(JSON.parse(content).OPENAI_API_KEY).toBe('global-key');
  });
});
