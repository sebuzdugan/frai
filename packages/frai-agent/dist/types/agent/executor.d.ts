import { AgentExecutor } from "langchain/agents";
import type { BaseMessage } from "langchain/schema";
export interface AgentConfig {
    model?: string;
    temperature?: number;
    verbose?: boolean;
}
export interface AgentRunOptions {
    input: string;
    history?: BaseMessage[];
    verbose?: boolean;
}
export declare const createFraIAgentExecutor: (config?: AgentConfig) => Promise<AgentExecutor>;
export declare const runFraIAgent: (options: AgentRunOptions) => Promise<import("langchain/schema").ChainValues>;
