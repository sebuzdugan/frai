import os from 'os';
import path from 'path';

import { GLOBAL_CONFIG_DIR, GLOBAL_CONFIG_FILE, LOCAL_ENV_FILENAME } from './constants.js';

export const resolveLocalEnvPath = (cwd = process.cwd()) =>
  path.join(cwd, LOCAL_ENV_FILENAME);

export const resolveGlobalConfigDir = (homeDir = os.homedir()) =>
  path.join(homeDir, GLOBAL_CONFIG_DIR);

export const resolveGlobalConfigPath = (homeDir = os.homedir()) =>
  path.join(resolveGlobalConfigDir(homeDir), GLOBAL_CONFIG_FILE);
