#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import process from 'process';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { Config, Documents, Eval, Finetune, Providers, Questionnaire, Rag, Scanners } from 'frai-core';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const DOC_FILENAMES = ['checklist.md', 'model_card.md', 'risk_file.md'];
const LOCAL_ENV_DISPLAY = '.env';
const GLOBAL_CONFIG_DISPLAY = '~/.config/frai/config';
const log = {
    info(message, meta) {
        console.log(formatLog('info', message, meta));
    },
    success(message, meta) {
        console.log(formatLog('success', message, meta));
    },
    warn(message, meta) {
        console.warn(formatLog('warn', message, meta));
    },
    error(message, meta) {
        console.error(formatLog('error', message, meta));
    }
};
function formatLog(level, message, meta = undefined) {
    const timestamp = new Date().toISOString();
    if (!meta || Object.keys(meta).length === 0) {
        return `[${timestamp}] ${level.toUpperCase()} ${message}`;
    }
    let serializedMeta = '';
    try {
        serializedMeta = JSON.stringify(meta);
    }
    catch (error) {
        serializedMeta = String(meta);
    }
    return `[${timestamp}] ${level.toUpperCase()} ${message} ${serializedMeta}`;
}
function listDocs() {
    const cwd = process.cwd();
    const items = DOC_FILENAMES.filter((file) => fs.existsSync(path.join(cwd, file)));
    if (!items.length) {
        log.info('No documentation files detected in current directory.', { cwd });
        return;
    }
    log.info('Documentation files found:', { files: items });
    items.forEach((file) => console.log(`  - ${file}`));
}
function cleanDocs() {
    const cwd = process.cwd();
    let removed = 0;
    for (const file of DOC_FILENAMES) {
        const target = path.join(cwd, file);
        if (fs.existsSync(target)) {
            fs.unlinkSync(target);
            removed += 1;
            log.info(`Removed ${file}`);
        }
    }
    if (!removed) {
        log.info('No documentation files to remove.');
    }
    else {
        log.success('Documentation directory cleaned.', { removed });
    }
}
function exportDocsAsPdf() {
    const existing = DOC_FILENAMES.filter((file) => fs.existsSync(file));
    if (!existing.length) {
        log.warn('No documentation files to export.');
        return;
    }
    try {
        execSync(`npx markdown-pdf ${existing.join(' ')}`, { stdio: 'inherit' });
        log.success('PDF export complete.');
    }
    catch (error) {
        log.error('Failed to export documentation as PDF.', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
function showConfigStatus() {
    const local = {
        exists: Config.hasLocalApiKey(),
        value: Config.getLocalApiKey()
    };
    const global = {
        exists: Config.hasGlobalApiKey(),
        value: Config.getGlobalApiKey()
    };
    const status = {
        local: {
            configured: local.exists,
            location: LOCAL_ENV_DISPLAY
        },
        global: {
            configured: global.exists,
            location: GLOBAL_CONFIG_DISPLAY
        }
    };
    log.info('API key configuration status', status);
    if (local.exists) {
        log.info('Local API key detected (masked).');
    }
    if (global.exists) {
        log.info('Global API key detected (masked).');
    }
    if (!local.exists && !global.exists) {
        log.warn('No OpenAI API key configured. Some AI powered features will be unavailable.');
    }
}
async function configureApiKeyIfProvided(key, scopeGlobal = false) {
    if (!key)
        return;
    if (scopeGlobal) {
        Config.setGlobalApiKey(key);
        log.success('Stored OpenAI API key in global configuration.', { location: GLOBAL_CONFIG_DISPLAY });
    }
    else {
        Config.setLocalApiKey(key);
        log.success('Stored OpenAI API key in local configuration.', { location: LOCAL_ENV_DISPLAY });
    }
}
function resolveConfiguredApiKey() {
    const local = Config.getLocalApiKey();
    if (local)
        return local;
    return Config.getGlobalApiKey();
}
async function promptForApiKey(scopeGlobal) {
    const answers = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: `Enter your OpenAI API key (${scopeGlobal ? 'global' : 'local'} storage):`,
            mask: '*',
            validate: (value) => Boolean(value?.trim()) || 'API key is required.'
        }
    ]);
    await configureApiKeyIfProvided(answers.apiKey, scopeGlobal);
    return answers.apiKey;
}
function summarizeScanResult(scan) {
    if (!scan)
        return '';
    const libraryEntries = Object.entries(scan.aiLibraryMatches ?? {}).sort((a, b) => b[1] - a[1]);
    const functionEntries = Object.entries(scan.aiFunctionMatches ?? {}).sort((a, b) => b[1] - a[1]);
    const libraries = libraryEntries.slice(0, 5).map(([name, count]) => `${name} (${count})`).join(', ');
    const functions = functionEntries.slice(0, 5).map(([name, count]) => `${name} (${count})`).join(', ');
    return [
        `Detected ${scan.aiFiles.length} AI related files out of ${scan.totalFiles} scanned.`,
        libraries ? `Top libraries: ${libraries}` : 'No AI libraries detected.',
        functions ? `Top functions: ${functions}` : 'No AI-specific functions detected.'
    ].join('\n');
}
function runScanCommand({ root = process.cwd(), ci = false, json = false, silent = false }) {
    const result = Scanners.scanCodebase({ root });
    if (json) {
        console.log(JSON.stringify(result, null, 2));
        return result;
    }
    if (!silent) {
        log.info('Scan completed.', {
            totalFiles: result.totalFiles,
            aiFiles: result.aiFiles.length
        });
        if (result.aiFiles.length) {
            console.log('AI-related files:');
            result.aiFiles.forEach((file) => console.log(`  - ${path.relative(root, file)}`));
        }
        if (!result.aiFiles.length) {
            log.info('No AI indicators detected in scope.');
        }
        if (ci) {
            log.info('CI mode: exiting after scan.');
        }
    }
    return result;
}
let cachedFetch = null;
async function resolveFetchImplementation() {
    if (typeof globalThis.fetch === 'function') {
        return globalThis.fetch.bind(globalThis);
    }
    if (cachedFetch)
        return cachedFetch;
    const mod = await import('node-fetch');
    cachedFetch = (mod.default ?? mod);
    return cachedFetch;
}
async function generateAITips(answers, apiKey, scan) {
    if (!apiKey) {
        return null;
    }
    try {
        const fetchImpl = await resolveFetchImplementation();
        const provider = Providers.createProvider({
            apiKey,
            fetch: fetchImpl
        });
        const context = Documents.buildContextForAITips(answers);
        const scanSummary = summarizeScanResult(scan);
        const prompt = [
            'You are an expert in responsible AI implementation.',
            'Provide three actionable recommendations for each documentation artefact (checklist, model card, risk file).',
            'Ground the advice in the following feature context and scan summary.'
        ].join(' ');
        const userContent = [
            'AI Feature Context:',
            context,
            '',
            'Scan Summary:',
            scanSummary || 'No automated scan results were available.'
        ].join('\n');
        const response = await provider.chatCompletion({
            messages: [
                {
                    role: 'system',
                    content: prompt
                },
                {
                    role: 'user',
                    content: userContent
                }
            ],
            temperature: 0.3,
            maxTokens: 800
        });
        if (!response?.content)
            return null;
        return String(response.content).trim();
    }
    catch (error) {
        log.warn('Unable to generate AI assistance tips. Continuing without them.', {
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}
function extractTips(markdown) {
    const sections = {
        checklist: '',
        modelCard: '',
        riskFile: ''
    };
    if (!markdown) {
        return sections;
    }
    const markers = {
        'checklist tips': 'checklist',
        'model card tips': 'modelCard',
        'risk file tips': 'riskFile'
    };
    let current = null;
    const lines = markdown.split('\n');
    for (const line of lines) {
        const normalized = line.trim().toLowerCase();
        const key = normalized.replace(/[:\s]+$/u, '');
        const sectionKey = markers[key];
        if (sectionKey) {
            current = sectionKey;
            sections[sectionKey] = '';
            continue;
        }
        if (current) {
            sections[current] = `${sections[current]}${line}\n`;
        }
    }
    for (const key of Object.keys(sections)) {
        sections[key] = sections[key].trim();
    }
    return sections;
}
async function runGenerateFlow(options) {
    await configureApiKeyIfProvided(options.key, options.global);
    const apiKey = resolveConfiguredApiKey();
    if (options.showConfig) {
        showConfigStatus();
    }
    let scanResult = null;
    if (options.scan || options.ci) {
        scanResult = runScanCommand({ ci: options.ci, silent: false });
        if ((!scanResult || scanResult.aiFiles.length === 0) && options.ci) {
            log.info('CI mode completed with no AI code detected. Exiting without generating documentation.');
            return;
        }
        if (scanResult && scanResult.aiFiles.length === 0 && !options.ci) {
            const { proceed } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: 'No AI indicators detected. Generate documentation manually?',
                    default: true
                }
            ]);
            if (!proceed) {
                log.info('Documentation generation cancelled.');
                return;
            }
        }
    }
    const answers = await Questionnaire.runQuestionnaire({ prompt: (questions) => inquirer.prompt(questions) });
    log.info('Generating documentation artefacts...');
    const aiTips = await generateAITips(answers, apiKey ?? null, scanResult);
    const tipSections = extractTips(aiTips);
    const { checklist, modelCard, riskFile } = Documents.generateDocuments({
        answers,
        tips: tipSections
    });
    fs.writeFileSync('checklist.md', checklist, 'utf8');
    fs.writeFileSync('model_card.md', modelCard, 'utf8');
    fs.writeFileSync('risk_file.md', riskFile, 'utf8');
    log.success('Responsible AI documentation generated.', {
        files: DOC_FILENAMES
    });
    if (options.exportPdf) {
        exportDocsAsPdf();
    }
    if (!apiKey) {
        log.warn('AI guidance tips were skipped because no API key is configured.');
    }
}
async function runSetupFlow(key, scopeGlobal = false) {
    if (key) {
        await configureApiKeyIfProvided(key, scopeGlobal);
        return;
    }
    if (!scopeGlobal) {
        const { scope } = await inquirer.prompt([
            {
                type: 'list',
                name: 'scope',
                message: 'Where should we store the OpenAI API key?',
                choices: [
                    { name: `Local project (${LOCAL_ENV_DISPLAY})`, value: 'local' },
                    { name: `Global config (${GLOBAL_CONFIG_DISPLAY})`, value: 'global' }
                ],
                default: 'local'
            }
        ]);
        scopeGlobal = scope === 'global';
    }
    await promptForApiKey(scopeGlobal);
}
function checkForUpdates() {
    const currentVersion = pkg.version ?? '0.0.0';
    try {
        const remote = execSync('npm view frai version', { encoding: 'utf8' }).trim();
        if (!remote) {
            log.warn('Unable to determine latest version from npm.');
            return;
        }
        if (remote === currentVersion) {
            log.success('You are running the latest FRAI CLI release.', { version: currentVersion });
        }
        else {
            log.info('A newer FRAI CLI release is available.', {
                current: currentVersion,
                latest: remote
            });
            console.log(`Update with: npm install -g frai@${remote}`);
        }
    }
    catch (error) {
        log.warn('Failed to check for updates.', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
function assertFileExists(targetPath) {
    if (!fs.existsSync(targetPath)) {
        throw new Error(`File not found: ${targetPath}`);
    }
}
function runEvalCommand(options) {
    assertFileExists(options.outputs);
    const dataset = Eval.loadDataset({
        outputsPath: options.outputs,
        referencesPath: options.references
    });
    const evaluations = Eval.runEvaluations({
        outputs: dataset.outputs,
        references: dataset.references
    });
    const report = Eval.generateReport({
        evaluations,
        outputsPath: dataset.outputsPath,
        referencesPath: dataset.referencesPath
    });
    const resolvedPath = Eval.writeReport({
        report,
        format: options.format ?? 'json',
        reportPath: options.report
    });
    log.success('Evaluation report generated.', { path: resolvedPath });
}
function runRagIndexCommand(options) {
    const payload = Rag.indexDocuments({
        input: options.input,
        output: options.output,
        chunkSize: options.chunkSize,
        extensions: options.extensions
    });
    log.success('RAG index created.', {
        documentCount: payload.metadata.documentCount,
        entryCount: payload.metadata.entryCount,
        output: options.output ?? 'frai-index.json'
    });
}
function runFinetuneTemplateCommand(options) {
    const template = Finetune.createGovernanceTemplate();
    const target = options.output ? path.resolve(options.output) : path.resolve(process.cwd(), 'frai-finetune-plan.json');
    fs.writeFileSync(target, JSON.stringify(template, null, 2), 'utf8');
    log.success('Fine-tuning governance template written.', { path: target });
}
function runFinetuneValidateCommand(planPath, options) {
    const absolute = path.resolve(planPath);
    assertFileExists(absolute);
    const raw = fs.readFileSync(absolute, 'utf8');
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (error) {
        throw new Error(`Invalid JSON: ${error.message}`);
    }
    const validation = Finetune.validateGovernancePlan(parsed);
    if (!validation.valid) {
        log.error('Fine-tuning governance plan is invalid.');
        validation.errors.forEach((errorItem) => {
            console.error(` - ${errorItem.path}: ${errorItem.message}`);
        });
    }
    else {
        log.success('Fine-tuning governance plan is valid.');
    }
    if (options.readiness) {
        const readiness = Finetune.calculateReadiness(parsed);
        log.info('Readiness checkpoint status', readiness);
        console.log(Finetune.summarizeGovernance(parsed));
    }
}
async function handleCompatibilityOptions(options) {
    if (options.update) {
        checkForUpdates();
        if (!options.scan && !options.setup && !options.listDocs && !options.clean) {
            return;
        }
    }
    if (options.setup) {
        await runSetupFlow(options.key, options.global);
        return;
    }
    if (options.listDocs) {
        listDocs();
        return;
    }
    if (options.clean) {
        cleanDocs();
        return;
    }
    const exportOnly = options.exportPdf &&
        !options.scan &&
        !options.ci &&
        !options.setup &&
        !options.listDocs &&
        !options.clean &&
        !options.update &&
        !options.showConfig &&
        !options.key;
    if (exportOnly) {
        exportDocsAsPdf();
        return;
    }
    const showConfigOnly = options.showConfig &&
        !options.scan &&
        !options.ci &&
        !options.setup &&
        !options.listDocs &&
        !options.clean &&
        !options.update &&
        !options.exportPdf &&
        !options.key;
    if (showConfigOnly) {
        showConfigStatus();
        return;
    }
    await runGenerateFlow(options);
}
async function main() {
    const program = new Command();
    program
        .name('frai')
        .description('Responsible AI toolkit for documentation, scanning, evaluation, and governance.')
        .version(pkg.version ?? '0.0.0')
        .option('--scan', 'Run code scanning before documentation generation')
        .option('--ci', 'Run in CI mode (scan + exit if no AI indicators)')
        .option('--setup', 'Shortcut to open API key setup flow')
        .option('--key <apiKey>', 'Provide an OpenAI API key for this invocation', undefined)
        .option('--global', 'Persist provided API key in the global config store', false)
        .option('--list-docs', 'List generated documentation files')
        .option('--clean', 'Remove generated documentation files')
        .option('--export-pdf', 'Export documentation files as PDFs')
        .option('--show-config', 'Display API key configuration status')
        .option('--update', 'Check for new CLI releases')
        .action(async (options) => {
        await handleCompatibilityOptions({
            scan: options.scan,
            ci: options.ci,
            setup: options.setup,
            key: options.key,
            global: options.global,
            listDocs: options.listDocs,
            clean: options.clean,
            exportPdf: options.exportPdf,
            showConfig: options.showConfig,
            update: options.update
        });
    });
    program
        .command('generate')
        .description('Run the interactive documentation workflow.')
        .option('--scan', 'Run code scanning before documentation generation')
        .option('--ci', 'Run in CI mode')
        .option('--key <apiKey>', 'Provide an OpenAI API key for this invocation', undefined)
        .option('--global', 'Persist provided API key in the global config store', false)
        .option('--export-pdf', 'Export generated docs to PDF')
        .option('--show-config', 'Display API key configuration status')
        .action(async (options) => {
        await runGenerateFlow(options);
    });
    program
        .command('scan')
        .description('Scan the current codebase for AI/ML artefacts.')
        .option('--ci', 'Run in CI mode')
        .option('--json', 'Print raw JSON results')
        .action((options) => {
        runScanCommand({
            ci: Boolean(options.ci),
            json: Boolean(options.json),
            silent: false
        });
    });
    program
        .command('setup')
        .description('Configure the OpenAI API key store.')
        .option('--key <apiKey>', 'Provide an API key to store')
        .option('--global', 'Store the API key globally (instead of local project)')
        .action(async (options) => {
        await runSetupFlow(options.key, Boolean(options.global));
    });
    program
        .command('config')
        .description('Display API key configuration status.')
        .action(() => {
        showConfigStatus();
    });
    const docsCommand = program.command('docs').description('Manage generated documentation artefacts.');
    docsCommand
        .command('list')
        .description('List generated documentation files.')
        .action(() => listDocs());
    docsCommand
        .command('clean')
        .description('Remove generated documentation files.')
        .action(() => cleanDocs());
    docsCommand
        .command('export')
        .description('Export documentation to PDF using markdown-pdf.')
        .action(() => exportDocsAsPdf());
    program
        .command('rag')
        .description('Compliance-aware retrieval-augmented generation tooling.')
        .command('index')
        .description('Create a vector index for documents.')
        .option('--input <path>', 'Input file or directory (default: cwd)')
        .option('--output <path>', 'Output vector store JSON (default: frai-index.json)')
        .option('--chunk-size <words>', 'Words per chunk (default: 800)', (value) => Number.parseInt(value, 10))
        .option('--extensions <list>', 'Comma-separated list of allowed file extensions', (value) => value.split(',').map((ext) => ext.trim().toLowerCase()))
        .action((options) => {
        runRagIndexCommand({
            input: options.input,
            output: options.output,
            chunkSize: options.chunkSize,
            extensions: options.extensions
        });
    });
    program
        .command('eval')
        .description('Run evaluation metrics on model outputs.')
        .requiredOption('--outputs <file>', 'Path to JSON file containing model outputs')
        .option('--references <file>', 'Path to JSON file containing reference outputs')
        .option('--report <path>', 'Report path (default: frai-eval-report.json)')
        .option('--format <format>', 'Report format (json or markdown)', 'json')
        .action((options) => {
        runEvalCommand(options);
    });
    const finetuneCommand = program.command('finetune').description('Fine-tuning governance utilities.');
    finetuneCommand
        .command('template')
        .description('Generate a governance template JSON file.')
        .option('--output <path>', 'Where to write the template (default: frai-finetune-plan.json)')
        .action((options) => {
        runFinetuneTemplateCommand(options);
    });
    finetuneCommand
        .command('validate <plan>')
        .description('Validate a fine-tuning governance plan JSON.')
        .option('--readiness', 'Calculate readiness checkpoints after validation', false)
        .action((plan, options) => {
        runFinetuneValidateCommand(plan, options);
    });
    program
        .command('update')
        .description('Check for new FRAI CLI releases.')
        .action(() => {
        checkForUpdates();
    });
    try {
        await program.parseAsync(process.argv);
    }
    catch (error) {
        log.error('CLI execution failed.', {
            error: error instanceof Error ? error.message : String(error)
        });
        process.exit(1);
    }
}
void main();
