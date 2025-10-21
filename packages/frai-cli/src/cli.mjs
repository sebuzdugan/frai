#!/usr/bin/env node
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import path from 'path';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

let coreModules;
try {
  coreModules = await import('frai-core');
} catch (error) {
  coreModules = await import('../../frai-core/src/index.js');
}

const {
  Config: {
    hasGlobalApiKey = () => false,
    hasLocalApiKey = () => false,
    getGlobalApiKey = () => null,
    getLocalApiKey = () => null,
    setGlobalApiKey = () => {
      throw new Error('Global config not available');
    },
    setLocalApiKey = () => {
      throw new Error('Local config not available');
    }
  } = {},
  Questionnaire: { runQuestionnaire } = { runQuestionnaire: async () => ({}) },
  Documents: {
    generateDocuments = () => ({ checklist: '', modelCard: '', riskFile: '', context: {} }),
    buildContextForAITips = () => ''
  } = {},
  Scanners: {
    scanCodebase = () => ({
      aiFiles: [],
      totalFiles: 0,
      aiLibraryMatches: {},
      aiFunctionMatches: {}
    })
  } = {}
} = coreModules;

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json for --version
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const LOCAL_ENV_DISPLAY = '.env';
const GLOBAL_CONFIG_DISPLAY = '~/.config/frai/config';

// Early CLI argument handling for instant exit commands
const args = process.argv.slice(2);
function printHelp() {
  console.log(`\nFRAI - Responsible AI in Minutes\n\nUsage:\n  frai                # Interactive mode for documenting an AI feature\n  frai --scan         # Scan codebase for AI/ML code and generate docs\n  frai --setup        # Set up your OpenAI API key (local/global)\n  frai --ci           # Run in CI mode (non-interactive)\n\nGeneral Commands:\n  frai --help, -h     # Show this help message\n  frai --version, -v  # Show version\n  frai --update       # Check for new versions of FRAI\n\nDocumentation Management:\n  frai --list-docs    # List generated documentation files\n  frai --clean        # Remove generated documentation files\n  frai --export-pdf   # Export documentation markdown files as PDFs\n\nConfiguration:\n  frai --show-config  # Show API key config status\n  frai --key=API_KEY  # Provide OpenAI API key directly\n  frai --global       # Use with --setup to save API key globally\n\nDocs generated:\n  - checklist.md      # Implementation checklist\n  - model_card.md     # Model card\n  - risk_file.md      # Risk & compliance\n\nLearn more: https://github.com/sebastianbuzdugan/frai\n`);
}
function printListDocs() {
  const files = ['checklist.md', 'model_card.md', 'risk_file.md'];
  let found = false;
  console.log('\nDocumentation files in current directory:');
  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log(`  - ${file}`);
      found = true;
    }
  }
  if (!found) {
    console.log('  (none found)');
  }
}
function cleanDocs() {
  const files = ['checklist.md', 'model_card.md', 'risk_file.md'];
  let removed = false;
  for (const file of files) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      removed = true;
      console.log(`Removed ${file}`);
    }
  }
  if (!removed) {
    console.log('No documentation files to remove.');
  }
}
function showConfig() {
  const localPresent = hasLocalApiKey();
  const globalPresent = hasGlobalApiKey();
  console.log('\nFRAI API Key Configuration:');
  console.log(`  - Local ${LOCAL_ENV_DISPLAY}: ${localPresent ? 'PRESENT' : 'not found'}`);
  console.log(`  - Global config (${GLOBAL_CONFIG_DISPLAY}): ${globalPresent ? 'PRESENT' : 'not found'}`);
  if (!localPresent && !globalPresent) {
    console.log('  No API key configured.');
  }
}
async function checkUpdate() {
  try {
    const latest = execSync('npm view frai version', { encoding: 'utf8' }).trim();
    if (latest !== pkg.version) {
      console.log(`\nA newer version of FRAI is available: ${latest} (current: ${pkg.version})`);
      console.log('Update with: npm install -g frai');
    } else {
      console.log('\nYou are using the latest version of FRAI.');
    }
  } catch (e) {
    console.log('Could not check for updates (npm not available or network issue).');
  }
}
async function exportPDF() {
  const files = ['checklist.md', 'model_card.md', 'risk_file.md'];
  let converted = false;
  for (const file of files) {
    if (fs.existsSync(file)) {
      const pdfFile = file.replace(/\.md$/, '.pdf');
      try {
        execSync(`npx markdown-pdf "${file}" -o "${pdfFile}"`, { stdio: 'ignore' });
        console.log(`Exported ${file} -> ${pdfFile}`);
        converted = true;
      } catch (e) {
        console.log(`Could not export ${file} to PDF. Please install markdown-pdf globally or use another tool.`);
      }
    }
  }
  if (!converted) {
    console.log('No documentation markdown files found to export.');
  }
}

// Setup function to initialize API key if not present
async function setupApiKey(options = {}) {
  // If key is provided directly via --key, use it without saving
  if (options.key) {
    return options.key;
  }
  
  // If --setup is specified, always prompt for new key
  if (options.setup) {
    return await promptAndSaveKey(options);
  }
  
  // Try to get key from environment or config files
  let apiKey = process.env.OPENAI_API_KEY || getLocalApiKey();

  if (!apiKey) {
    apiKey = getGlobalApiKey();
  }
  
  // If still no key, prompt the user
  if (!apiKey && !options.ci) {
    try {
      // Defensive: check if inquirer is defined
      if (typeof inquirer === 'undefined') {
        console.error('You must run frai --setup to configure your OpenAI API key before using FRAI.');
        process.exit(1);
      }
      console.log('OpenAI API key not found.');
      const { shouldSetup } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldSetup',
          message: 'Would you like to set up your OpenAI API key now?',
          default: true,
        },
      ]);
      if (shouldSetup) {
        apiKey = await promptAndSaveKey(options);
      } else {
        console.log('No API key provided. AI tips will be disabled.');
      }
    } catch (e) {
      console.error('You must run frai --setup to configure your OpenAI API key before using FRAI.');
      process.exit(1);
    }
  }
  
  return apiKey;
}

async function promptAndSaveKey(options = {}) {
  const { key } = await inquirer.prompt([
    {
      type: 'password',
      name: 'key',
      message: 'Enter your OpenAI API key:',
      validate: input => input.length > 0 ? true : 'API key cannot be empty',
    },
  ]);
  
  const { saveLocation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'saveLocation',
      message: 'Where would you like to save your API key?',
      choices: [
        { name: 'Project only (current directory)', value: 'local' },
        { name: 'Global (available to all projects)', value: 'global' }
      ],
      default: options.global ? 'global' : 'local',
    },
  ]);
  
  if (saveLocation === 'local') {
    setLocalApiKey(key);
    console.log('API key saved to .env file in current directory.');
  } else {
    setGlobalApiKey(key);
    console.log('API key saved globally in ~/.config/frai/config.');
  }
  
  return key;
}

// Enhanced parseArgs to support help/version
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    setup: false,
    global: false,
    key: null,
    scan: false,
    ci: false,
    help: false,
    version: false
  };
  for (const arg of args) {
    if (arg === '--setup') {
      options.setup = true;
    } else if (arg === '--global') {
      options.global = true;
    } else if (arg === '--scan') {
      options.scan = true;
    } else if (arg === '--ci') {
      options.ci = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg.startsWith('--key=')) {
      options.key = arg.split('=')[1];
    }
  }
  return options;
}

const OPENAI_MODEL = 'gpt-4.1-nano-2025-04-14';

// Generate suggestions based on code scan
async function generateSuggestions(scanResults, apiKey) {
  if (!apiKey || !scanResults.aiFiles.length) {
    return null;
  }
  
  try {
    // Prepare a summary of the scan results
    const librariesFound = Object.values(scanResults.aiLibraryMatches).flat();
    const functionsFound = Object.values(scanResults.aiFunctionMatches).flat();
    
    // Count occurrences of each library and function
    const libraryCounts = {};
    librariesFound.forEach(lib => {
      libraryCounts[lib] = (libraryCounts[lib] || 0) + 1;
    });
    
    const functionCounts = {};
    functionsFound.forEach(func => {
      functionCounts[func] = (functionCounts[func] || 0) + 1;
    });
    
    // Get the top 5 most commonly used libraries and functions
    const topLibraries = Object.entries(libraryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lib, count]) => `${lib} (${count})`);
      
    const topFunctions = Object.entries(functionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([func, count]) => `${func} (${count})`);
    
    
    const prompt = `You are an expert in responsible AI development. Based on automatic code scanning, I detected AI-related code in ${scanResults.aiFiles.length} files out of ${scanResults.totalFiles} total code files.

## Code Analysis:
**Top AI Libraries Found**: ${topLibraries.join(', ')}
**Top AI Functions Found**: ${topFunctions.join(', ')}

Based on this specific code analysis, generate comprehensive but actionable documentation templates for:

1. **Checklist Recommendations** - Specific responsible AI practices relevant to the detected libraries and functions
2. **Model Card Template** - Structured template appropriate for the detected AI technologies
3. **Risk Assessment** - Potential risks and mitigation strategies based on the detected patterns

Requirements:
- Be specific to the detected technologies (not generic)
- Include actionable items developers can implement
- Focus on the most common responsible AI concerns for these specific libraries/functions
- Structure each section with clear headings and bullet points

Format the response in Markdown with clear section headers (### headings).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert in responsible AI development and code analysis. Generate specific, actionable documentation templates tailored to the detected AI technologies and functions. Focus on practical implementation guidance rather than generic advice.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 900,
        temperature: 0.3
      })
    });
    
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content.trim();
    }
    return null;
  } catch (e) {
    console.error('Error generating suggestions:', e);
    return null;
  }
}

async function getAITips(answers, apiKey) {
  if (!apiKey) {
    return 'AI tips disabled. Set OPENAI_API_KEY in .env file to enable.';
  }
  
  try {
    // Build a comprehensive context for better AI tips
    const context = buildContextForAITips(answers);
    
    const prompt = `You are an expert in responsible AI development. Based on the following comprehensive AI feature analysis, provide 2-3 specific, actionable tips for each documentation category.

AI Feature Context:
${context}

Please provide practical, implementation-focused tips that are:
1. Specific to the technology stack and use case described
2. Actionable with clear next steps
3. Prioritized by impact/importance
4. Focused on the specific risks and characteristics identified

Format as:
Checklist Tips:
- [specific tip with clear action]
- [specific tip with clear action]
- [specific tip with clear action]

Model Card Tips:
- [specific tip with clear action]
- [specific tip with clear action]
- [specific tip with clear action]

Risk File Tips:
- [specific tip with clear action]
- [specific tip with clear action]
- [specific tip with clear action]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert in responsible AI implementation. Your tips should be specific, actionable, and tailored to the exact context provided. Focus on practical implementation steps rather than general advice.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.3
      })
    });
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content.trim();
    }
    return 'No tips generated.';
  } catch (e) {
    return 'Could not fetch AI tips (API error).';
  }
}

function extractTipsSection(aiTips, sectionName) {
  if (!aiTips || typeof aiTips !== 'string') {
    return 'No specific tips available for this section.';
  }
  
  const regex = new RegExp(`${sectionName}([\\s\\S]*?)(?=(?:Checklist Tips:|Model Card Tips:|Risk File Tips:)|$)`, 'i');
  const match = aiTips.match(regex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return 'No specific tips available for this section.';
}

async function runCodeScan(options, apiKey) {
  console.log('Scanning codebase for AI-related patterns...');
  const scanResults = scanCodebase({ root: process.cwd() });
  
  console.log(`\nScan Results:`);
  console.log(`- Found ${scanResults.aiFiles.length} files with AI code out of ${scanResults.totalFiles} total code files`);
  
  if (scanResults.aiFiles.length > 0) {
    console.log('\nAI-related files detected:');
    scanResults.aiFiles.slice(0, 10).forEach(file => {
      const relativePath = path.relative(process.cwd(), file);
      const libraries = scanResults.aiLibraryMatches[file] || [];
      const functions = scanResults.aiFunctionMatches[file] || [];
      
      console.log(`- ${relativePath}`);
      if (libraries.length) console.log(`  Libraries: ${libraries.join(', ')}`);
      if (functions.length) console.log(`  Functions: ${functions.join(', ')}`);
    });
    
    if (scanResults.aiFiles.length > 10) {
      console.log(`\n...and ${scanResults.aiFiles.length - 10} more files`);
    }
    
    // Generate suggestions based on scan results
    console.log('\nGenerating documentation suggestions...');
    const suggestions = await generateSuggestions(scanResults, apiKey);
    
    if (suggestions) {
      // Save suggestions to files
      console.log('Writing documentation templates...');
      
      const sections = suggestions.split(/(?=###)/);
      
      // Extract checklist section
      const checklistSection = sections.find(s => /###.*checklist/i.test(s)) || '';
      fs.writeFileSync('checklist.md', `# Responsible AI Feature Checklist\n\n${checklistSection.replace(/###.*checklist/i, '')}\n`);
      
      // Extract model card section
      const modelCardSection = sections.find(s => /###.*model card/i.test(s)) || '';
      fs.writeFileSync('model_card.md', `# Model Card\n\n${modelCardSection.replace(/###.*model card/i, '')}\n`);
      
      // Extract risk file section
      const riskSection = sections.find(s => /###.*risk/i.test(s)) || '';
      fs.writeFileSync('risk_file.md', `# AI Model Risk & Compliance\n\n${riskSection.replace(/###.*risk/i, '')}\n`);
      
      console.log('Documentation templates generated based on code scan.');
    } else {
      console.log('Could not generate documentation suggestions. Please run the interactive mode.');
    }
    
    return true;
  } else {
    console.log('No AI-related code detected.');
    return false;
  }
}

// Check for required packages
let dotenv, fetch;

(async () => {
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  if (args.includes('--version') || args.includes('-v')) {
    console.log(pkg.version);
    process.exit(0);
  }
  if (args.includes('--list-docs')) {
    printListDocs();
    process.exit(0);
  }
  if (args.includes('--clean')) {
    cleanDocs();
    process.exit(0);
  }
  if (args.includes('--show-config')) {
    showConfig();
    process.exit(0);
  }
  if (args.includes('--update')) {
    await checkUpdate();
    process.exit(0);
  }
  if (args.includes('--export-pdf')) {
    await exportPDF();
    process.exit(0);
  }
  
  // Only import heavy modules after early exit checks pass
  try {
    dotenv = await import('dotenv');
    dotenv.config();
  } catch (e) {
    console.log('Required package "dotenv" not found. Installing it now...');
    console.log('Please run: npm install dotenv');
    process.exit(1);
  }

  try {
    fetch = (await import('node-fetch')).default;
  } catch (e) {
    console.log('Required package "node-fetch" not found. Installing it now...');
    console.log('Please run: npm install node-fetch');
    process.exit(1);
  }


  // Setup API key if needed
  const apiKey = await setupApiKey(parseArgs());
  
  // If only --setup, configure API key and exit
  if (parseArgs().setup && !parseArgs().key && !parseArgs().scan && process.argv.length <= 3) {
    console.log('Setup complete. Run again without --setup to use the framework.');
    process.exit(0);
  }
  
  // If the user just wants to set up the key or provide it directly, and not run the full tool
  if (parseArgs().setup && !parseArgs().scan && process.argv.length <= 4) {
    process.exit(0);
  }
  
  // If scan mode is requested, run the code scanner
  if (parseArgs().scan) {
    const foundAI = await runCodeScan(parseArgs(), apiKey);
    
    // If in CI mode and AI code found, exit successfully
    if (parseArgs().ci && foundAI) {
      console.log('RAI documentation generated successfully in CI mode.');
      process.exit(0);
    }
    
    // If in CI mode and no AI code found, exit successfully but with a message
    if (parseArgs().ci && !foundAI) {
      console.log('No AI code detected in CI mode, skipping documentation generation.');
      process.exit(0);
    }
    
    // If not in CI mode, continue with interactive mode if AI code found
    if (!parseArgs().ci && foundAI) {
      console.log('\nWould you like to refine the documentation with interactive mode?');
      
      if (!parseArgs().ci) {
        const { interactive } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'interactive',
            message: 'Run interactive mode to refine documentation?',
            default: true,
          }
        ]);
        
        if (!interactive) {
          process.exit(0);
        }
      } else {
        process.exit(0);
      }
    } else if (!parseArgs().ci && !foundAI) {
      console.log('\nWould you like to manually document an AI feature?');
      
      const { manualMode } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'manualMode',
          message: 'Run in manual mode to document AI features?',
          default: true,
        }
      ]);
      
      if (!manualMode) {
        process.exit(0);
      }
    }
  }
  
  const { isAI } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'isAI',
      message: 'Is this commit introducing or modifying an AI feature?',
      default: false,
    },
  ]);

  if (!isAI) {
    console.log('No AI feature detected. Proceeding with commit.');
    process.exit(0);
  }

  // Progressive questionnaire - starts with core questions, then adapts based on answers
  console.log('\n🎯 Let\'s gather some context about your AI feature...\n');

  const allAnswers = await runQuestionnaire({
    prompt: (questions) => inquirer.prompt(questions)
  });

  // Generate improved summaries with more context
  console.log('\n✨ Generating documentation...\n');

  // Get AI tips with improved context
  let aiTips = '';
  if (apiKey) {
    aiTips = await getAITips(allAnswers, apiKey);
  } else {
    aiTips = "\n*No tips available. Add an OpenAI API key to receive AI-powered recommendations.*";
  }

  // Save files with improved structure and formatting
  const checklistTips = extractTipsSection(aiTips, 'Checklist Tips:');
  const modelCardTips = extractTipsSection(aiTips, 'Model Card Tips:');
  const riskFileTips = extractTipsSection(aiTips, 'Risk File Tips:');

  const { checklist, modelCard, riskFile } = generateDocuments({
    answers: allAnswers,
    tips: {
      checklist: checklistTips,
      modelCard: modelCardTips,
      riskFile: riskFileTips
    }
  });

  // Write files
  fs.writeFileSync('checklist.md', checklist);
  fs.writeFileSync('model_card.md', modelCard);
  fs.writeFileSync('risk_file.md', riskFile);

  console.log('✅ Responsible AI documentation generated successfully!');
  console.log('📄 Generated files:');
  console.log('  - checklist.md');
  console.log('  - model_card.md');
  console.log('  - risk_file.md');
  console.log('\n🚀 Ready for production with responsible AI practices!');
  process.exit(0);
})(); 
