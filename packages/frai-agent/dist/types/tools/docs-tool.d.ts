import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
export declare const generateDocumentsTool: DynamicStructuredTool<z.ZodObject<{
    answersJson: z.ZodString;
    outputDir: z.ZodOptional<z.ZodString>;
    overwrite: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    answersJson?: string;
    outputDir?: string;
    overwrite?: boolean;
}, {
    answersJson?: string;
    outputDir?: string;
    overwrite?: boolean;
}>>;
