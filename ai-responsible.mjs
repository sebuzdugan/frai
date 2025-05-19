#!/usr/bin/env node
import inquirer from 'inquirer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for required packages
let dotenv, fetch;
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

// Define config paths
const LOCAL_ENV_PATH = path.join(process.cwd(), '.env');
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'framework-rai');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config');

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
  let apiKey = process.env.OPENAI_API_KEY;
  
  // If not in env, try local .env file (dotenv already loaded it)
  if (!apiKey && options.global) {
    // Try global config
    try {
      if (fs.existsSync(GLOBAL_CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf8'));
        apiKey = config.OPENAI_API_KEY;
      }
    } catch (error) {
      // If error reading global config, continue without it
    }
  }
  
  // If still no key, prompt the user
  if (!apiKey) {
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
    fs.writeFileSync(LOCAL_ENV_PATH, `OPENAI_API_KEY=${key}\n`, { flag: 'w' });
    console.log('API key saved to .env file in current directory.');
  } else {
    // Global config
    if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
      fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify({ OPENAI_API_KEY: key }, null, 2));
    console.log('API key saved globally in ~/.config/framework-rai/config.');
  }
  
  return key;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    setup: false,
    global: false,
    key: null
  };
  
  for (const arg of args) {
    if (arg === '--setup') {
      options.setup = true;
    } else if (arg === '--global') {
      options.global = true;
    } else if (arg.startsWith('--key=')) {
      options.key = arg.split('=')[1];
    }
  }
  
  return options;
}

const OPENAI_MODEL = 'gpt-4.1-nano-2025-04-14';

async function getAITips(answers, apiKey) {
  if (!apiKey) {
    return 'AI tips disabled. Set OPENAI_API_KEY in .env file to enable.';
  }
  
  try {
    const prompt = `Given the following answers about an AI feature, give only 2–3 practical, actionable tips for each category (checklist, model card, risk file). Tips should be specific actions the developer can take in the project. Format the output as:\n\nChecklist Tips:\n- ...\nModel Card Tips:\n- ...\nRisk File Tips:\n- ...\n\nAnswers: ${JSON.stringify(answers, null, 2)}`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert in responsible AI. Give only 2–3 practical, actionable tips for each category, based on the user answers.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 350,
        temperature: 0.5
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

async function main() {
  // Parse command line arguments
  const options = parseArgs();
  
  // If only --setup, configure API key and exit
  if (options.setup && !options.key && process.argv.length <= 3) {
    await setupApiKey(options);
    console.log('Setup complete. Run again without --setup to use the framework.');
    process.exit(0);
  }
  
  // Setup API key if needed
  const apiKey = await setupApiKey(options);
  
  // If the user just wants to set up the key or provide it directly, and not run the full tool
  if (options.setup && process.argv.length <= 4) {
    process.exit(0);
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

  // Checklist (minimal)
  const checklist = await inquirer.prompt([
    {
      type: 'list',
      name: 'purpose',
      message: 'Main purpose of this AI feature?',
      choices: [
        'User-facing feature',
        'Internal analytics',
        'Automation/decision support',
        'Other'
      ]
    },
    {
      type: 'list',
      name: 'data',
      message: 'What data does it use?',
      choices: [
        'Only anonymized data',
        'Personal data with consent',
        'No personal data',
        'Other'
      ]
    },
    {
      type: 'list',
      name: 'monitoring',
      message: 'Is there a monitoring plan?',
      choices: [
        'Automated monitoring',
        'Manual review',
        'User feedback',
        'No monitoring'
      ]
    }
  ]);

  // Model Card (minimal)
  const modelCard = await inquirer.prompt([
    {
      type: 'list',
      name: 'modelType',
      message: 'Model type?',
      choices: [
        'Classification',
        'Regression',
        'Clustering',
        'NLP/Language',
        'Other'
      ]
    },
    {
      type: 'list',
      name: 'metric',
      message: 'Key metric?',
      choices: [
        'Accuracy',
        'F1 Score',
        'AUC/ROC',
        'Other'
      ]
    },
    {
      type: 'list',
      name: 'limitation',
      message: 'Main limitation?',
      choices: [
        'Data bias',
        'Limited generalization',
        'Explainability',
        'None known'
      ]
    }
  ]);

  // Risk File (minimal)
  const riskFile = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'privacy',
      message: 'Are privacy and regulatory checks done?',
      default: true
    },
    {
      type: 'confirm',
      name: 'bias',
      message: 'Is bias/fairness reviewed?',
      default: true
    }
  ]);

  // Generate summaries
  const checklistSummary = `This AI feature is mainly for ${checklist.purpose.toLowerCase()}, using ${checklist.data.toLowerCase()}. Monitoring approach: ${checklist.monitoring.toLowerCase()}.`;
  const modelCardSummary = `Model type: ${modelCard.modelType}. Key metric: ${modelCard.metric}. Main limitation: ${modelCard.limitation}.`;
  const riskSummary = `Privacy/regulatory checks: ${riskFile.privacy ? 'Yes' : 'No'}. Bias/fairness reviewed: ${riskFile.bias ? 'Yes' : 'No'}.`;

  // Get AI tips
  const allAnswers = { checklist, modelCard, riskFile };
  let aiTips = '';
  if (apiKey) {
    aiTips = await getAITips(allAnswers, apiKey);
  } else {
    aiTips = "\n*No tips available. Add an OpenAI API key to receive AI-powered recommendations.*";
  }

  // Save files (overwrite)
  fs.writeFileSync('checklist.md', `# Responsible AI Feature Checklist\n\n${checklistSummary}\n\n## Tips\n${aiTips.match(/Checklist Tips:[\s\S]*?(?=Model Card Tips:|Risk File Tips:|$)/)?.[0] || aiTips}\n`);
  fs.writeFileSync('model_card.md', `# Model Card\n\n${modelCardSummary}\n\n## Tips\n${aiTips.match(/Model Card Tips:[\s\S]*?(?=Checklist Tips:|Risk File Tips:|$)/)?.[0] || aiTips}\n`);
  fs.writeFileSync('risk_file.md', `# AI Model Risk & Compliance\n\n${riskSummary}\n\n## Tips\n${aiTips.match(/Risk File Tips:[\s\S]*?(?=Checklist Tips:|Model Card Tips:|$)/)?.[0] || aiTips}\n`);

  console.log('Responsible AI documentation updated! Proceeding with commit.');
  process.exit(0);
}

main(); 