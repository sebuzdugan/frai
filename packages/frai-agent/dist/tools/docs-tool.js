import fs from "node:fs";
import path from "node:path";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { Documents } from "frai-core";
import { resolveWorkingDirectory } from "../config/env.js";
const DOC_FILENAMES = {
    checklist: "checklist.md",
    modelCard: "model_card.md",
    riskFile: "risk_file.md"
};
const parseAnswers = (payload) => {
    try {
        const parsed = JSON.parse(payload);
        return parsed;
    }
    catch (error) {
        throw new Error("Invalid answers payload. Provide a JSON string that matches FRAI questionnaire structure.");
    }
};
const schema = z.object({
    answersJson: z
        .string()
        .describe("JSON string containing FRAI questionnaire answers (core, impact, data, performance, monitoring, bias)."),
    outputDir: z
        .string()
        .describe("Optional output directory. Defaults to the current working directory.")
        .optional(),
    overwrite: z
        .boolean()
        .describe("Whether to overwrite existing docs. Defaults to true.")
        .optional()
});
export const generateDocumentsTool = new DynamicStructuredTool({
    name: "generate_responsible_ai_docs",
    description: "Create FRAI checklist, model card, and risk file from questionnaire answers. The agent should supply answers as JSON with keys: core, impact, data, performance, monitoring, bias.",
    schema,
    func: async ({ answersJson, outputDir, overwrite }) => {
        const answers = parseAnswers(answersJson);
        const cwd = resolveWorkingDirectory(outputDir);
        const shouldOverwrite = overwrite ?? true;
        const { checklist, modelCard, riskFile } = Documents.generateDocuments({
            answers,
            tips: {}
        });
        const outputs = [
            { name: DOC_FILENAMES.checklist, content: checklist },
            { name: DOC_FILENAMES.modelCard, content: modelCard },
            { name: DOC_FILENAMES.riskFile, content: riskFile }
        ];
        const written = [];
        const skipped = [];
        for (const doc of outputs) {
            const targetPath = path.join(cwd, doc.name);
            if (!shouldOverwrite && fs.existsSync(targetPath)) {
                skipped.push(path.relative(process.cwd(), targetPath));
                continue;
            }
            fs.writeFileSync(targetPath, doc.content, "utf8");
            written.push(path.relative(process.cwd(), targetPath));
        }
        return [
            `Generated FRAI documentation in ${cwd}.`,
            written.length ? `Written: ${written.join(", ")}.` : null,
            skipped.length ? `Skipped (already existed): ${skipped.join(", ")}.` : null
        ]
            .filter(Boolean)
            .join(" ");
    }
});
