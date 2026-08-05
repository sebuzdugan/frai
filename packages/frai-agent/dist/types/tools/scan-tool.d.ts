import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
export declare const scanRepositoryTool: DynamicStructuredTool<z.ZodObject<{
    root: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    root?: string;
}, {
    root?: string;
}>>;
