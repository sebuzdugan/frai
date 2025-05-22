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

// AI-related library patterns to detect
const AI_LIBRARIES = [
  // Python ML/AI libraries
  'sklearn', 'scikit-learn', 'tensorflow', 'torch', 'pytorch', 'keras', 'xgboost',
  'lightgbm', 'catboost', 'transformers', 'huggingface', 'spacy', 'nltk', 
  'gensim', 'fastai', 'opencv', 'cv2',
  // JavaScript ML/AI libraries
  '@tensorflow', 'ml5', 'brain.js', 'synaptic', '@huggingface', 
  // R packages
  'caret', 'randomForest', 'xgboost', 'kernlab', 'nnet', 'rpart'
];

// AI-related function patterns to detect
const AI_FUNCTIONS = [
  // Training/fitting
  'fit', 'train', 'fit_transform', 'compile',
  // Prediction/inference
  'predict', 'transform', 'inference', 'forward',
  // Evaluation
  'score', 'evaluate', 'accuracy_score', 'classification_report',
  // Data preparation
  'preprocessing', 'tokenize', 'encode', 'normalize'
];

// File extensions to scan
const CODE_EXTENSIONS = ['.py', '.ipynb', '.js', '.ts', '.jsx', '.tsx', '.r', '.rmd', '.java', '.scala'];

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
  if (!apiKey && !options.ci) {
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
    key: null,
    scan: false,
    ci: false
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
    } else if (arg.startsWith('--key=')) {
      options.key = arg.split('=')[1];
    }
  }
  
  return options;
}

const OPENAI_MODEL = 'gpt-4.1-nano-2025-04-14';

// Function to recursively scan directories for AI-related code
function scanForAICode(directory, excludedDirs = ['node_modules', '.git']) {
  const result = {
    aiFiles: [],
    totalFiles: 0,
    aiLibraryMatches: {},
    aiFunctionMatches: {}
  };
  
  function scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        // Skip excluded directories
        if (excludedDirs.includes(item)) {
          continue;
        }
        
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          // Recursively scan subdirectory
          scanDirectory(fullPath);
        } else if (stats.isFile() && CODE_EXTENSIONS.includes(path.extname(fullPath).toLowerCase())) {
          // Scan code file
          result.totalFiles++;
          
          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            let isAIFile = false;
            
            // Check for AI libraries
            for (const library of AI_LIBRARIES) {
              // Look for import/require statements with the library name
              const regex = new RegExp(`(import|from|require\\s*\\(\\s*['"'])\\s*${library}`, 'i');
              if (regex.test(fileContent)) {
                isAIFile = true;
                result.aiLibraryMatches[fullPath] = result.aiLibraryMatches[fullPath] || [];
                result.aiLibraryMatches[fullPath].push(library);
              }
            }
            
            // Check for AI functions
            for (const func of AI_FUNCTIONS) {
              // Pattern matches function calls like functionName() or object.functionName()
              const regex = new RegExp(`[\\s\\.\(]${func}\\s*\\(`, 'g');
              if (regex.test(fileContent)) {
                isAIFile = true;
                result.aiFunctionMatches[fullPath] = result.aiFunctionMatches[fullPath] || [];
                result.aiFunctionMatches[fullPath].push(func);
              }
            }
            
            if (isAIFile) {
              result.aiFiles.push(fullPath);
            }
          } catch (e) {
            console.error(`Error reading file ${fullPath}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.error(`Error scanning directory ${dir}: ${e.message}`);
    }
  }
  
  scanDirectory(directory);
  
  // Remove duplicates in aiFiles
  result.aiFiles = [...new Set(result.aiFiles)];
  
  return result;
}

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
    
    const scanSummary = {
      aiFilesCount: scanResults.aiFiles.length,
      totalFiles: scanResults.totalFiles,
      topLibraries,
      topFunctions,
      fileCount: Math.min(scanResults.aiFiles.length, 5)  // List up to 5 files
    };
    
    const prompt = `Based on automatic code scanning, I found ${scanResults.aiFiles.length} files with AI-related code out of ${scanResults.totalFiles} total code files. 
Top libraries: ${topLibraries.join(', ')}
Top functions: ${topFunctions.join(', ')}

Based solely on this information, generate these sections:
1. Pre-filled checklist suggestions - key points to address for responsible AI based on the detected libraries and functions
2. Model card template - minimal starting template suitable for the detected AI technologies
3. Risk assessment - potential risks associated with the detected patterns

Format the response in Markdown, with 3 sections (### headings).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert in responsible AI development. Generate helpful, concise documentation templates.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 700,
        temperature: 0.5
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

async function runCodeScan(options, apiKey) {
  console.log('Scanning codebase for AI-related patterns...');
  const scanResults = scanForAICode(process.cwd());
  
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

async function main() {
  // Parse command line arguments
  const options = parseArgs();
  
  // Setup API key if needed
  const apiKey = await setupApiKey(options);
  
  // If only --setup, configure API key and exit
  if (options.setup && !options.key && !options.scan && process.argv.length <= 3) {
    console.log('Setup complete. Run again without --setup to use the framework.');
    process.exit(0);
  }
  
  // If the user just wants to set up the key or provide it directly, and not run the full tool
  if (options.setup && !options.scan && process.argv.length <= 4) {
    process.exit(0);
  }
  
  // If scan mode is requested, run the code scanner
  if (options.scan) {
    const foundAI = await runCodeScan(options, apiKey);
    
    // If in CI mode and AI code found, exit successfully
    if (options.ci && foundAI) {
      console.log('RAI documentation generated successfully in CI mode.');
      process.exit(0);
    }
    
    // If in CI mode and no AI code found, exit successfully but with a message
    if (options.ci && !foundAI) {
      console.log('No AI code detected in CI mode, skipping documentation generation.');
      process.exit(0);
    }
    
    // If not in CI mode, continue with interactive mode if AI code found
    if (!options.ci && foundAI) {
      console.log('\nWould you like to refine the documentation with interactive mode?');
      
      if (!options.ci) {
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
    } else if (!options.ci && !foundAI) {
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