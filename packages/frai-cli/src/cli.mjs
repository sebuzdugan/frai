#!/usr/bin/env node
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json for --version
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

// Define config paths
const LOCAL_ENV_PATH = path.join(process.cwd(), '.env');
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'frai');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config');

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
  let local = fs.existsSync(LOCAL_ENV_PATH);
  let global = fs.existsSync(GLOBAL_CONFIG_PATH);
  console.log('\nFRAI API Key Configuration:');
  if (local) {
    console.log('  - Local .env file: PRESENT');
  } else {
    console.log('  - Local .env file: not found');
  }
  if (global) {
    console.log('  - Global config (~/.config/frai/config): PRESENT');
  } else {
    console.log('  - Global config (~/.config/frai/config): not found');
  }
  if (!local && !global) {
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
    fs.writeFileSync(LOCAL_ENV_PATH, `OPENAI_API_KEY=${key}\n`, { flag: 'w' });
    console.log('API key saved to .env file in current directory.');
  } else {
    // Global config
    if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
      fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify({ OPENAI_API_KEY: key }, null, 2));
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

function buildContextForAITips(answers) {
  const { core, impact, data, performance, monitoring, bias } = answers;
  
  let context = `Purpose: ${getPurposeDescription(core.purpose)}\n`;
  context += `Model Type: ${getModelTypeDescription(core.modelType)}\n`;
  context += `Data Type: ${getDataDescription(core.dataType)}\n`;
  
  // Add impact details
  const impactInfo = getImpactDescription(impact);
  if (impactInfo) {
    context += `Impact Level: ${impactInfo}\n`;
  }
  
  // Add data protection/source details
  if (data.dataProtection) {
    context += `Data Protection: ${getDataProtectionDescription(data.dataProtection)}\n`;
  }
  if (data.dataSource) {
    context += `Data Source: ${getDataSourceDescription(data.dataSource)}\n`;
  }
  
  context += `Primary Metric: ${getMetricDescription(performance.primaryMetric)}\n`;
  context += `Monitoring: ${getMonitoringDescription(monitoring.monitoring)}\n`;
  context += `Bias Considerations: ${getBiasDescription(bias.biasConsiderations)}\n`;
  
  // Add risk assessment
  const riskLevel = calculateRiskLevel(answers);
  context += `Risk Level: ${riskLevel.level} (${riskLevel.score}/10)\n`;
  context += `Risk Factors: ${riskLevel.factors.join(', ')}\n`;
  
  return context;
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

// Helper functions for generating structured summaries
function generateChecklistSummary(answers) {
  const { core, impact, data, performance, monitoring, bias } = answers;
  
  // Build contextual summary
  let summary = `## AI Feature Overview\n\n`;
  summary += `**Purpose**: ${getPurposeDescription(core.purpose)}\n`;
  summary += `**Model Type**: ${getModelTypeDescription(core.modelType)}\n`;
  summary += `**Data Handling**: ${getDataDescription(core.dataType)}\n`;
  
  // Add impact assessment
  const impactInfo = getImpactDescription(impact);
  if (impactInfo) {
    summary += `**Impact Level**: ${impactInfo}\n`;
  }
  
  // Add data protection if relevant
  if (data.dataProtection) {
    summary += `**Data Protection**: ${getDataProtectionDescription(data.dataProtection)}\n`;
  } else if (data.dataSource) {
    summary += `**Data Source**: ${getDataSourceDescription(data.dataSource)}\n`;
  }
  
  summary += `**Primary Metric**: ${getMetricDescription(performance.primaryMetric)}\n`;
  summary += `**Monitoring**: ${getMonitoringDescription(monitoring.monitoring)}\n`;
  summary += `**Bias Considerations**: ${getBiasDescription(bias.biasConsiderations)}\n`;
  
  return summary;
}

function generateModelCardSummary(answers) {
  const { core, impact, data, performance, monitoring, bias } = answers;
  
  let summary = `## Model Information\n\n`;
  summary += `**Model Type**: ${getModelTypeDescription(core.modelType)}\n`;
  summary += `**Primary Use Case**: ${getPurposeDescription(core.purpose)}\n`;
  summary += `**Key Performance Metric**: ${getMetricDescription(performance.primaryMetric)}\n`;
  
  // Add model-specific details
  const impactInfo = getImpactDescription(impact);
  if (impactInfo) {
    summary += `**Risk Level**: ${impactInfo}\n`;
  }
  
  summary += `\n## Data & Training\n\n`;
  summary += `**Data Type**: ${getDataDescription(core.dataType)}\n`;
  
  if (data.dataSource) {
    summary += `**Data Source**: ${getDataSourceDescription(data.dataSource)}\n`;
  }
  
  summary += `\n## Performance & Monitoring\n\n`;
  summary += `**Monitoring Approach**: ${getMonitoringDescription(monitoring.monitoring)}\n`;
  summary += `**Bias Mitigation**: ${getBiasDescription(bias.biasConsiderations)}\n`;
  
  return summary;
}

function generateRiskSummary(answers) {
  const { core, impact, data, performance, monitoring, bias } = answers;
  
  let summary = `## Risk Assessment\n\n`;
  
  // Calculate risk level
  const riskLevel = calculateRiskLevel(answers);
  summary += `**Overall Risk Level**: ${riskLevel.level} (${riskLevel.score}/10)\n`;
  summary += `**Risk Factors**: ${riskLevel.factors.join(', ')}\n\n`;
  
  summary += `## Compliance & Governance\n\n`;
  summary += `**Data Protection**: ${data.dataProtection ? getDataProtectionDescription(data.dataProtection) : 'Standard measures'}\n`;
  summary += `**Bias & Fairness**: ${getBiasDescription(bias.biasConsiderations)}\n`;
  summary += `**Monitoring**: ${getMonitoringDescription(monitoring.monitoring)}\n`;
  
  // Add specific recommendations based on risk level
  if (riskLevel.level === 'High' || riskLevel.level === 'Critical') {
    summary += `\n## Recommended Actions\n\n`;
    summary += `- Implement comprehensive monitoring and alerting\n`;
    summary += `- Regular bias testing and fairness audits\n`;
    summary += `- Enhanced documentation and approval processes\n`;
    summary += `- Regular security and privacy assessments\n`;
  }
  
  return summary;
}

// Helper functions for descriptive text
function getPurposeDescription(purpose) {
  const descriptions = {
    'user-facing': 'User-facing feature (recommendations, search, etc.)',
    'internal': 'Internal analytics and insights',
    'automation': 'Automation and decision support',
    'content': 'Content generation and processing',
    'other': 'Other AI application'
  };
  return descriptions[purpose] || purpose;
}

function getModelTypeDescription(modelType) {
  const descriptions = {
    'classification': 'Classification model (categorizing data)',
    'regression': 'Regression model (predicting numerical values)',
    'nlp': 'Natural Language Processing model',
    'vision': 'Computer Vision model',
    'recommendations': 'Recommendation system',
    'clustering': 'Clustering/grouping model',
    'other': 'Other/Multiple model types'
  };
  return descriptions[modelType] || modelType;
}

function getDataDescription(dataType) {
  const descriptions = {
    'anonymized': 'Anonymized/aggregated data only',
    'personal-consent': 'Personal data with user consent',
    'personal-internal': 'Personal data (internal/employee)',
    'public': 'Public data only',
    'sensitive': 'Sensitive data (health, financial, etc.)',
    'no-personal': 'No personal data'
  };
  return descriptions[dataType] || dataType;
}

function getDataProtectionDescription(protection) {
  const descriptions = {
    'full-protection': 'Comprehensive (encryption, access controls, audit logs)',
    'standard-protection': 'Standard (encryption and access controls)',
    'basic-protection': 'Basic access controls only',
    'implementing': 'Currently implementing protections'
  };
  return descriptions[protection] || protection;
}

function getDataSourceDescription(source) {
  const descriptions = {
    'internal': 'Internal company data',
    'public': 'Public datasets and APIs',
    'third-party': 'Third-party data vendors',
    'user-generated': 'User-generated content',
    'mixed': 'Mixed sources'
  };
  return descriptions[source] || source;
}

function getImpactDescription(impact) {
  if (!impact) return null;
  
  const impactKey = Object.keys(impact)[0];
  const impactValue = impact[impactKey];
  
  const descriptions = {
    'low': 'Low impact',
    'medium': 'Medium impact',
    'high': 'High impact',
    'critical': 'Critical impact',
    'processing': 'Data processing only',
    'recommendations': 'Recommendation system',
    'autonomous-oversight': 'Autonomous with oversight',
    'autonomous': 'Fully autonomous'
  };
  
  return descriptions[impactValue] || impactValue;
}

function getMetricDescription(metric) {
  const descriptions = {
    'accuracy': 'Accuracy/Precision',
    'f1': 'F1 Score/Recall',
    'auc': 'AUC/ROC',
    'satisfaction': 'User satisfaction/engagement',
    'business': 'Business KPIs (revenue, conversion, etc.)',
    'latency': 'Latency/Performance',
    'other': 'Other/Multiple metrics'
  };
  return descriptions[metric] || metric;
}

function getMonitoringDescription(monitoring) {
  const descriptions = {
    'automated-realtime': 'Real-time automated monitoring with alerts',
    'automated-reports': 'Regular automated reports with manual review',
    'manual-periodic': 'Manual periodic reviews',
    'user-feedback': 'User feedback collection',
    'basic-logging': 'Basic logging only',
    'no-monitoring': 'No monitoring implemented yet'
  };
  return descriptions[monitoring] || monitoring;
}

function getBiasDescription(bias) {
  const descriptions = {
    'comprehensive': 'Comprehensive testing across demographic groups',
    'statistical': 'Statistical bias testing on key metrics',
    'diverse-data': 'Diverse training data with basic testing',
    'planning': 'Aware of issue, planning to address',
    'not-applicable': 'Not applicable or not considered yet'
  };
  return descriptions[bias] || bias;
}

function calculateRiskLevel(answers) {
  const { core, impact, data, performance, monitoring, bias } = answers;
  let score = 0;
  const factors = [];
  
  // Data sensitivity scoring
  if (core.dataType === 'sensitive') {
    score += 3;
    factors.push('Sensitive data');
  } else if (core.dataType.includes('personal')) {
    score += 2;
    factors.push('Personal data');
  }
  
  // Impact scoring
  const impactValue = impact ? Object.values(impact)[0] : null;
  if (impactValue === 'critical') {
    score += 4;
    factors.push('Critical impact');
  } else if (impactValue === 'high') {
    score += 3;
    factors.push('High impact');
  } else if (impactValue === 'medium') {
    score += 2;
    factors.push('Medium impact');
  }
  
  // Monitoring scoring (lower is higher risk)
  if (monitoring.monitoring === 'no-monitoring') {
    score += 2;
    factors.push('No monitoring');
  } else if (monitoring.monitoring === 'basic-logging') {
    score += 1;
    factors.push('Basic monitoring');
  }
  
  // Bias considerations (lower is higher risk)
  if (bias.biasConsiderations === 'not-applicable') {
    score += 2;
    factors.push('No bias considerations');
  } else if (bias.biasConsiderations === 'planning') {
    score += 1;
    factors.push('Bias planning needed');
  }
  
  // Purpose-based scoring
  if (core.purpose === 'user-facing') {
    score += 1;
    factors.push('User-facing');
  }
  
  // Determine risk level
  let level;
  if (score >= 7) {
    level = 'Critical';
  } else if (score >= 5) {
    level = 'High';
  } else if (score >= 3) {
    level = 'Medium';
  } else {
    level = 'Low';
  }
  
  return { level, score, factors };
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

  const inquirer = (await import('inquirer')).default;

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

  // Core context questions (always asked)
  const coreQuestions = await inquirer.prompt([
    {
      type: 'list',
      name: 'purpose',
      message: '1/8 - What\'s the main purpose of this AI feature?',
      choices: [
        { name: 'User-facing feature (recommendations, search, etc.)', value: 'user-facing' },
        { name: 'Internal analytics/insights', value: 'internal' },
        { name: 'Automation/decision support', value: 'automation' },
        { name: 'Content generation/processing', value: 'content' },
        { name: 'Other', value: 'other' }
      ]
    },
    {
      type: 'list',
      name: 'modelType',
      message: '2/8 - What type of AI model/approach are you using?',
      choices: [
        { name: 'Classification (categorizing data)', value: 'classification' },
        { name: 'Regression (predicting numbers)', value: 'regression' },
        { name: 'NLP/Language models (text processing)', value: 'nlp' },
        { name: 'Computer Vision (image/video)', value: 'vision' },
        { name: 'Recommendation system', value: 'recommendations' },
        { name: 'Clustering/grouping', value: 'clustering' },
        { name: 'Other/Multiple', value: 'other' }
      ]
    },
    {
      type: 'list',
      name: 'dataType',
      message: '3/8 - What type of data does your AI feature process?',
      choices: [
        { name: 'Only anonymized/aggregated data', value: 'anonymized' },
        { name: 'Personal data with user consent', value: 'personal-consent' },
        { name: 'Personal data (internal/employee)', value: 'personal-internal' },
        { name: 'Public data only', value: 'public' },
        { name: 'Sensitive data (health, financial, etc.)', value: 'sensitive' },
        { name: 'No personal data', value: 'no-personal' }
      ]
    }
  ]);

  // Progressive questions based on context
  let progressiveQuestions = {};
  
  // Question 4: Impact-based question
  if (coreQuestions.purpose === 'user-facing') {
    progressiveQuestions.impact = await inquirer.prompt([{
      type: 'list',
      name: 'userImpact',
      message: '4/8 - What\'s the potential impact on users if the AI makes mistakes?',
      choices: [
        { name: 'Low - Minor inconvenience (e.g., bad recommendations)', value: 'low' },
        { name: 'Medium - Affects user experience significantly', value: 'medium' },
        { name: 'High - Could affect user decisions/wellbeing', value: 'high' },
        { name: 'Critical - Could cause harm or major consequences', value: 'critical' }
      ]
    }]);
  } else if (coreQuestions.purpose === 'automation') {
    progressiveQuestions.impact = await inquirer.prompt([{
      type: 'list',
      name: 'automationImpact',
      message: '4/8 - What decisions does this AI automation make?',
      choices: [
        { name: 'Data processing/routing only', value: 'processing' },
        { name: 'Recommendations that humans review', value: 'recommendations' },
        { name: 'Autonomous decisions with human oversight', value: 'autonomous-oversight' },
        { name: 'Fully autonomous decisions', value: 'autonomous' }
      ]
    }]);
  } else {
    progressiveQuestions.impact = await inquirer.prompt([{
      type: 'list',
      name: 'generalImpact',
      message: '4/8 - What\'s the potential business/operational impact?',
      choices: [
        { name: 'Low - Internal insights/analytics', value: 'low' },
        { name: 'Medium - Affects workflows/processes', value: 'medium' },
        { name: 'High - Key business decisions depend on it', value: 'high' }
      ]
    }]);
  }

  // Question 5: Data-specific follow-up
  let dataQuestions = {};
  if (coreQuestions.dataType.includes('personal') || coreQuestions.dataType === 'sensitive') {
    dataQuestions = await inquirer.prompt([{
      type: 'list',
      name: 'dataProtection',
      message: '5/8 - How is sensitive data protected?',
      choices: [
        { name: 'Encryption + access controls + audit logs', value: 'full-protection' },
        { name: 'Encryption + access controls', value: 'standard-protection' },
        { name: 'Basic access controls only', value: 'basic-protection' },
        { name: 'Still implementing protections', value: 'implementing' }
      ]
    }]);
  } else {
    dataQuestions = await inquirer.prompt([{
      type: 'list',
      name: 'dataSource',
      message: '5/8 - Where does your training/input data come from?',
      choices: [
        { name: 'Internal company data', value: 'internal' },
        { name: 'Public datasets/APIs', value: 'public' },
        { name: 'Third-party data vendors', value: 'third-party' },
        { name: 'User-generated content', value: 'user-generated' },
        { name: 'Mixed sources', value: 'mixed' }
      ]
    }]);
  }

  // Question 6: Performance & monitoring
  const performanceQuestions = await inquirer.prompt([{
    type: 'list',
    name: 'primaryMetric',
    message: '6/8 - What\'s your primary success metric?',
    choices: [
      { name: 'Accuracy/Precision', value: 'accuracy' },
      { name: 'F1 Score/Recall', value: 'f1' },
      { name: 'AUC/ROC', value: 'auc' },
      { name: 'User satisfaction/engagement', value: 'satisfaction' },
      { name: 'Business KPIs (revenue, conversion, etc.)', value: 'business' },
      { name: 'Latency/Performance', value: 'latency' },
      { name: 'Other/Multiple', value: 'other' }
    ]
  }]);

  // Question 7: Monitoring approach
  const monitoringQuestions = await inquirer.prompt([{
    type: 'list',
    name: 'monitoring',
    message: '7/8 - How do you monitor the AI system in production?',
    choices: [
      { name: 'Real-time automated monitoring + alerts', value: 'automated-realtime' },
      { name: 'Regular automated reports + manual review', value: 'automated-reports' },
      { name: 'Manual periodic reviews', value: 'manual-periodic' },
      { name: 'User feedback collection', value: 'user-feedback' },
      { name: 'Basic logging only', value: 'basic-logging' },
      { name: 'No monitoring yet', value: 'no-monitoring' }
    ]
  }]);

  // Question 8: Bias & fairness considerations
  const biasQuestions = await inquirer.prompt([{
    type: 'list',
    name: 'biasConsiderations',
    message: '8/8 - How do you address potential bias and fairness?',
    choices: [
      { name: 'Comprehensive testing across demographic groups', value: 'comprehensive' },
      { name: 'Statistical bias testing on key metrics', value: 'statistical' },
      { name: 'Diverse training data + basic testing', value: 'diverse-data' },
      { name: 'Aware of issue, planning to address', value: 'planning' },
      { name: 'Not applicable/not considered yet', value: 'not-applicable' }
    ]
  }]);

  // Combine all answers
  const allAnswers = {
    core: coreQuestions,
    impact: progressiveQuestions.impact,
    data: dataQuestions,
    performance: performanceQuestions,
    monitoring: monitoringQuestions,
    bias: biasQuestions
  };

  // Generate improved summaries with more context
  console.log('\n✨ Generating documentation...\n');
  
  const checklistSummary = generateChecklistSummary(allAnswers);
  const modelCardSummary = generateModelCardSummary(allAnswers);
  const riskSummary = generateRiskSummary(allAnswers);

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

  // Generate comprehensive checklist file
  const checklistContent = `# Responsible AI Feature Checklist

${checklistSummary}

## Implementation Checklist

### Data & Privacy
- [ ] Data collection consent properly obtained and documented
- [ ] Data storage and access controls implemented
- [ ] Data retention and deletion policies defined
- [ ] Privacy impact assessment completed (if required)

### Model Development
- [ ] Training data quality and bias assessment completed
- [ ] Model validation and testing performed
- [ ] Performance benchmarks established
- [ ] Model limitations and assumptions documented

### Deployment & Monitoring
- [ ] Production monitoring and alerting configured
- [ ] Rollback procedures defined
- [ ] Performance degradation detection implemented
- [ ] User feedback collection mechanism established

### Governance & Compliance
- [ ] Stakeholder approval obtained
- [ ] Regulatory compliance verified
- [ ] Documentation review completed
- [ ] Incident response plan prepared

## AI-Powered Recommendations

${checklistTips}

---
*Generated by FRAI - Responsible AI in Minutes*`;

  // Generate comprehensive model card
  const modelCardContent = `# Model Card

${modelCardSummary}

## Intended Use
- **Primary Use Cases**: ${getPurposeDescription(allAnswers.core.purpose)}
- **Out-of-scope Uses**: To be defined based on specific implementation

## Training Data
- **Data Sources**: ${allAnswers.data.dataSource ? getDataSourceDescription(allAnswers.data.dataSource) : 'See data section above'}
- **Data Preprocessing**: Standard preprocessing applied
- **Data Limitations**: ${allAnswers.core.dataType === 'sensitive' ? 'Sensitive data requires careful handling' : 'Standard data limitations apply'}

## Evaluation
- **Primary Metric**: ${getMetricDescription(allAnswers.performance.primaryMetric)}
- **Performance**: To be measured in production
- **Bias Testing**: ${getBiasDescription(allAnswers.bias.biasConsiderations)}

## Ethical Considerations
- **Bias & Fairness**: ${getBiasDescription(allAnswers.bias.biasConsiderations)}
- **Privacy**: ${allAnswers.data.dataProtection ? getDataProtectionDescription(allAnswers.data.dataProtection) : 'Standard privacy measures'}
- **Transparency**: Model decisions should be explainable where possible

## Monitoring & Maintenance
- **Monitoring Strategy**: ${getMonitoringDescription(allAnswers.monitoring.monitoring)}
- **Update Frequency**: To be determined based on performance
- **Version Control**: Standard ML model versioning practices

## AI-Powered Recommendations

${modelCardTips}

---
*Generated by FRAI - Responsible AI in Minutes*`;

  // Generate comprehensive risk file
  const riskFileContent = `# AI Model Risk & Compliance

${riskSummary}

## Risk Mitigation Strategies

### Technical Risks
- **Model Performance**: Regular performance monitoring and validation
- **Data Quality**: Continuous data quality checks and validation
- **Security**: Secure model deployment and access controls
- **Scalability**: Performance testing under various load conditions

### Operational Risks
- **Human Oversight**: ${allAnswers.impact?.automationImpact === 'autonomous' ? 'Critical - implement human oversight' : 'Implement appropriate human oversight'}
- **Process Integration**: Ensure smooth integration with existing workflows
- **Training & Documentation**: Adequate training for operators and users
- **Incident Response**: Clear procedures for handling model failures

### Regulatory & Compliance
- **Data Protection**: ${allAnswers.data.dataProtection ? getDataProtectionDescription(allAnswers.data.dataProtection) : 'Standard compliance measures'}
- **Industry Standards**: Compliance with relevant industry standards
- **Audit Trail**: Comprehensive logging and audit capabilities
- **Documentation**: Complete documentation for regulatory review

## Monitoring & Alerting

### Key Metrics to Monitor
- Model performance metrics
- Data quality indicators
- System performance and availability
- User satisfaction and feedback

### Alert Thresholds
- Performance degradation beyond acceptable limits
- Data quality issues or anomalies
- System failures or errors
- Unusual usage patterns

## AI-Powered Recommendations

${riskFileTips}

---
*Generated by FRAI - Responsible AI in Minutes*`;

  // Write files
  fs.writeFileSync('checklist.md', checklistContent);
  fs.writeFileSync('model_card.md', modelCardContent);
  fs.writeFileSync('risk_file.md', riskFileContent);

  console.log('✅ Responsible AI documentation generated successfully!');
  console.log('📄 Generated files:');
  console.log('  - checklist.md');
  console.log('  - model_card.md');
  console.log('  - risk_file.md');
  console.log('\n🚀 Ready for production with responsible AI practices!');
  process.exit(0);
})(); 
