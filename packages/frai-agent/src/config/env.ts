import path from "node:path";
import process from "node:process";

import { Config } from "frai-core";

export interface ResolveEnvOptions {
  root?: string;
}

export const resolveWorkingDirectory = (root?: string) =>
  root ? path.resolve(process.cwd(), root) : process.cwd();

export const resolveOpenAiApiKey = (options: ResolveEnvOptions = {}) => {
  const cwd = options.root ? path.resolve(process.cwd(), options.root) : process.cwd();
  const existing = process.env.OPENAI_API_KEY?.trim();
  if (existing) {
    return existing;
  }

  const local = Config.getLocalApiKey(cwd);
  if (local) {
    process.env.OPENAI_API_KEY = local;
    return local;
  }

  const global = Config.getGlobalApiKey();
  if (global) {
    process.env.OPENAI_API_KEY = global;
    return global;
  }

  return null;
};

export const requireOpenAiApiKey = (options: ResolveEnvOptions = {}) => {
  const key = resolveOpenAiApiKey(options);
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is required. Configure it via `frai setup`, `.env`, or environment variables."
    );
  }
  return key;
};
