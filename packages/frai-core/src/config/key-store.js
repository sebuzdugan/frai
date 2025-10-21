import fs from 'fs';

import { resolveGlobalConfigDir, resolveGlobalConfigPath, resolveLocalEnvPath } from './paths.js';

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
};

const sanitizeValue = (value) => {
  if (!value) return null;
  return value.trim().replace(/^['"]|['"]$/g, '');
};

export const hasLocalApiKey = (cwd = process.cwd()) => fs.existsSync(resolveLocalEnvPath(cwd));

export const getLocalApiKey = (cwd = process.cwd()) => {
  const envPath = resolveLocalEnvPath(cwd);
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^\s*OPENAI_API_KEY\s*=\s*(.+)\s*$/m);
  return match ? sanitizeValue(match[1]) : null;
};

export const setLocalApiKey = (key, cwd = process.cwd()) => {
  if (!key) throw new Error('API key is required');
  const envPath = resolveLocalEnvPath(cwd);
  const content = `OPENAI_API_KEY=${key}\n`;
  fs.writeFileSync(envPath, content, { encoding: 'utf8', mode: 0o600 });
  return envPath;
};

export const hasGlobalApiKey = (homeDir = process.env.HOME || process.env.USERPROFILE) =>
  fs.existsSync(resolveGlobalConfigPath(homeDir));

export const getGlobalApiKey = (homeDir = process.env.HOME || process.env.USERPROFILE) => {
  const configPath = resolveGlobalConfigPath(homeDir);
  if (!fs.existsSync(configPath)) return null;
  const content = fs.readFileSync(configPath, 'utf8');
  try {
    const parsed = JSON.parse(content);
    return sanitizeValue(parsed.OPENAI_API_KEY);
  } catch (error) {
    return null;
  }
};

export const setGlobalApiKey = (key, homeDir = process.env.HOME || process.env.USERPROFILE) => {
  if (!key) throw new Error('API key is required');
  const configDir = resolveGlobalConfigDir(homeDir);
  ensureDir(configDir);
  const configPath = resolveGlobalConfigPath(homeDir);
  const payload = JSON.stringify({ OPENAI_API_KEY: key }, null, 2);
  fs.writeFileSync(configPath, payload, { encoding: 'utf8', mode: 0o600 });
  return configPath;
};
