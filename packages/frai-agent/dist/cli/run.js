#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import process from "node:process";
import { AIMessage, HumanMessage } from "langchain/schema";
import { createFraIAgentExecutor } from "../agent/executor.js";
const HELP_TEXT = `Usage: pnpm agent:frai "<instruction>"

Options:
  --model <name>       Override the default OpenAI model (default: gpt-4o-mini)
  --interactive        Start an interactive REPL session
  --verbose            Log tool usage
  --help               Show this message
`;
const parseArgs = () => {
    const raw = process.argv.slice(2);
    const options = {};
    const parts = [];
    for (let index = 0; index < raw.length; index += 1) {
        const arg = raw[index];
        if (arg === "--help" || arg === "-h") {
            console.log(HELP_TEXT);
            process.exit(0);
        }
        else if (arg === "--model") {
            index += 1;
            options.model = raw[index];
        }
        else if (arg.startsWith("--model=")) {
            options.model = arg.split("=")[1];
        }
        else if (arg === "--interactive" || arg === "-i") {
            options.interactive = true;
        }
        else if (arg === "--verbose" || arg === "-v") {
            options.verbose = true;
        }
        else {
            parts.push(arg);
        }
    }
    return {
        options,
        input: parts.join(" ").trim()
    };
};
const logIntermediateSteps = (response) => {
    const steps = (response.intermediateSteps ?? []);
    for (const step of steps) {
        if (step.action?.tool) {
            console.log(`→ Tool: ${step.action.tool}`);
            if (step.action.toolInput) {
                console.log(`  Input: ${JSON.stringify(step.action.toolInput)}`);
            }
        }
        if (step.observation) {
            console.log(`  Observation: ${typeof step.observation === "string" ? step.observation : JSON.stringify(step.observation)}`);
        }
    }
};
const runSingleTurn = async (utterance, options) => {
    const executor = await createFraIAgentExecutor({
        model: options.model,
        verbose: options.verbose
    });
    const response = (await executor.invoke({
        input: utterance,
        chat_history: []
    }));
    if (options.verbose) {
        logIntermediateSteps(response);
    }
    if (typeof response.output === "string") {
        console.log(response.output);
    }
    else {
        console.log(JSON.stringify(response.output, null, 2));
    }
};
const runInteractive = async (options) => {
    const executor = await createFraIAgentExecutor({
        model: options.model,
        verbose: options.verbose
    });
    const rl = readline.createInterface({ input, output });
    const history = [];
    console.log("FRAI agent ready. Type `exit` to quit.");
    while (true) {
        const message = (await rl.question("frai-agent> ")).trim();
        if (!message)
            continue;
        if (["exit", "quit", ":q"].includes(message.toLowerCase())) {
            break;
        }
        const response = (await executor.invoke({
            input: message,
            chat_history: history
        }));
        history.push(new HumanMessage(message));
        if (options.verbose) {
            logIntermediateSteps(response);
        }
        const outputText = typeof response.output === "string"
            ? response.output
            : JSON.stringify(response.output, null, 2);
        console.log(outputText);
        history.push(new AIMessage(outputText));
    }
    rl.close();
};
const main = async () => {
    const parsed = parseArgs();
    const hasInput = parsed.input.length > 0;
    if (!hasInput) {
        await runInteractive({ ...parsed.options, interactive: true });
        return;
    }
    await runSingleTurn(parsed.input, parsed.options);
};
main().catch((error) => {
    console.error("FRAI agent encountered an error:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
