import path from "node:path";

import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { Scanners } from "frai-core";

import { resolveWorkingDirectory } from "../config/env.js";

const schema = z.object({
  root: z
    .string()
    .describe("Optional path to scan. Defaults to the current working directory.")
    .optional()
});

export const scanRepositoryTool = new DynamicStructuredTool({
  name: "scan_repository",
  description:
    "Scan a codebase for AI indicators using FRAI's static detectors. Provide a relative path when scanning outside the current working directory.",
  schema,
  func: async ({ root }) => {
    const cwd = resolveWorkingDirectory(root);
    const result = Scanners.scanCodebase({ root: cwd });

    const aiFiles = result.aiFiles.map((file) => path.relative(cwd, file));
    // aiLibraryMatches structure: { [filePath]: [library1, library2, ...] }
    // We need to invert it to { [library]: [filePath1, filePath2, ...] }
    const libraryMap: Record<string, string[]> = {};
    for (const [filePath, libraries] of Object.entries(result.aiLibraryMatches)) {
      const relativePath = path.relative(cwd, filePath);
      for (const library of libraries as string[]) {
        if (!libraryMap[library]) {
          libraryMap[library] = [];
        }
        libraryMap[library].push(relativePath);
      }
    }
    const libraryMatches = Object.entries(libraryMap).map(([library, files]) => ({
      library,
      files
    }));

    const summary = [
      `Scanned ${result.totalFiles} source files.`,
      aiFiles.length
        ? `Detected ${aiFiles.length} AI-indicative files: ${aiFiles.join(", ")}.`
        : "No AI-indicative files detected.",
      libraryMatches.length
        ? `Library matches: ${libraryMatches
            .map(({ library, files }) => `${library} (${files.join(", ")})`)
            .join("; ")}.`
        : "No flagged AI libraries detected."
    ];

    return summary.join(" ");
  }
});
