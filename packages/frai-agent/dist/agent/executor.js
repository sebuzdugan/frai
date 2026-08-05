import { ChatPromptTemplate, MessagesPlaceholder } from "langchain/prompts";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { requireOpenAiApiKey } from "../config/env.js";
import { generateDocumentsTool, scanRepositoryTool } from "../tools/index.js";
import { SYSTEM_PROMPT } from "./prompt.js";
export const createFraIAgentExecutor = async (config = {}) => {
    requireOpenAiApiKey();
    const llm = new ChatOpenAI({
        modelName: config.model ?? "gpt-4o-mini",
        temperature: config.temperature ?? 0
    });
    const tools = [scanRepositoryTool, generateDocumentsTool];
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_PROMPT],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad")
    ]);
    const agent = await createOpenAIToolsAgent({
        llm,
        tools,
        prompt
    });
    return new AgentExecutor({
        agent,
        tools,
        verbose: config.verbose ?? false
    });
};
export const runFraIAgent = async (options) => {
    const executor = await createFraIAgentExecutor();
    return executor.invoke({
        input: options.input,
        chat_history: options.history ?? []
    });
};
