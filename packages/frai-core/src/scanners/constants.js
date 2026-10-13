export const DEFAULT_EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  '.venv',
  '__pycache__',
  '.idea',
  '.vscode',
  'dist',
  'build',
  'out',
  'coverage',
  'vendor'
];

export const DEFAULT_CODE_EXTENSIONS = [
  '.py',
  '.ipynb',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.r',
  '.rmd',
  '.java',
  '.scala',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts'
];

export const DEFAULT_AI_LIBRARIES = [
  // LLM and generative AI SDKs (the integrations AI disclosure rules care about most)
  'openai',
  '@openai',
  'anthropic',
  '@anthropic-ai',
  'langchain',
  '@langchain',
  'llama_index',
  'llamaindex',
  'google.generativeai',
  'google.genai',
  '@google/generative-ai',
  '@google/genai',
  'vertexai',
  'cohere',
  'cohere-ai',
  'mistralai',
  '@mistralai',
  'groq',
  'groq-sdk',
  'replicate',
  'ollama',
  'litellm',
  '@ai-sdk',
  // The Vercel AI SDK core package: import { streamText } from "ai"
  'ai',
  '@azure/openai',
  'azure.ai.inference',
  // Python ML/AI libraries
  'sklearn',
  'scikit-learn',
  'tensorflow',
  'torch',
  'pytorch',
  'keras',
  'xgboost',
  'lightgbm',
  'catboost',
  'transformers',
  'huggingface',
  'spacy',
  'nltk',
  'gensim',
  'fastai',
  'opencv',
  'cv2',
  // JavaScript ML/AI libraries
  '@tensorflow',
  'ml5',
  'brain.js',
  'synaptic',
  '@huggingface',
  // R packages
  'caret',
  'randomForest',
  'kernlab',
  'nnet',
  'rpart'
];

export const DEFAULT_AI_FUNCTIONS = [
  // Training/fitting
  'fit',
  'train',
  'fit_transform',
  'compile',
  // Prediction/inference
  'predict',
  'transform',
  'inference',
  'forward',
  // Evaluation
  'score',
  'evaluate',
  'accuracy_score',
  'classification_report',
  // Data preparation
  'preprocessing',
  'tokenize',
  'encode',
  'normalize',
  // Fine-tuning / generative
  'generate',
  'fine_tune',
  'finetune'
];

/**
 * Calls that only an AI SDK makes. A file with one of these is an AI file even when the client
 * comes from elsewhere (a wrapper module, a dependency-injected client).
 */
export const DEFAULT_MODEL_CALLS = [
  'chat.completions.create',
  'responses.create',
  'completions.create',
  'embeddings.create',
  'messages.create',
  'messages.stream',
  'generateText',
  'streamText',
  'generateObject',
  'streamObject',
  'generate_content',
  'generateContent',
  'ChatCompletion.create'
];
