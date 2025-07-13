# FRAI: Responsible AI in Minutes

A lightweight, developer-friendly framework that ensures responsible AI practices with minimal effort. Generate essential documentation, receive actionable tips, and comply with ethical guidelines—all in under 3 minutes per feature.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![npm version](https://img.shields.io/npm/v/frai)

## 🚀 Features

- **Fast & Frictionless**: Complete all documentation in under 3 minutes
- **AI-Powered Tips**: Receive 2-3 practical, actionable tips per category
- **Minimal Questions**: Answer only the most impactful questions
- **Pre-commit Integration**: Automate checks before code is committed
- **Automatic Code Scanning**: Detect AI libraries and functions in your codebase
- **GitHub Actions Integration**: Run frai checks in your CI pipeline
- **Comprehensive Documentation**: Generate three essential documents:
  - `checklist.md`: Essential questions for every AI feature
  - `model_card.md`: Simple model documentation
  - `risk_file.md`: Minimal audit & compliance steps

## 📋 Why Use FRAI?

Responsible AI shouldn't be a burden. This framework helps you:

- **Save Time**: No lengthy forms or complex processes
- **Ensure Compliance**: Cover essential ethical and regulatory requirements
- **Improve Documentation**: Create clear, consistent documentation
- **Get Actionable Advice**: Receive practical tips tailored to your AI feature

## 🔧 Installation

```bash
# Install globally
npm install -g frai

# Or use without installing
npx frai
```

### Setting Up Your OpenAI API Key

The first time you run the tool, it will prompt you to set up your OpenAI API key. You can also configure it explicitly:

```bash
# Initial setup wizard (interactive)
npx frai --setup

# Set up a global key (used across all projects)
npx frai --setup --global

# Run with a specific key without saving it
npx frai --key=your-api-key-here
```

#### API Key Storage Options

- **Project-specific**: Stored in `.env` in your project directory (default)
- **Global**: Stored in `~/.config/frai/config` (works across all projects)
- **Session-only**: Use the `--key` option for temporary use without saving

## 📝 Usage

### Basic Usage

Run the CLI tool in your project directory:

```bash
# If installed globally
frai

# Or using npx
npx frai
```

Answer the simple questions about your AI feature, and the framework will generate three markdown files:

- `checklist.md`
- `model_card.md`
- `risk_file.md`

### CLI Options

```bash
# Basic usage
npx frai

# Configure API key (interactive)
npx frai --setup

# Use a global API key (shared between projects)
npx frai --global

# Specify an API key directly (won't be saved)
npx frai --key=your-api-key-here

# Scan codebase for AI-related code
npx frai --scan

# Run in CI mode (non-interactive)
npx frai --scan --ci

# Combine options
npx frai --global --setup
```

### Pre-commit Hook (Recommended)

For automatic checks before each commit, install [Husky](https://typicode.github.io/husky/):

```bash
# Install Husky
npm install husky --save-dev
npx husky init

# Add the pre-commit hook
npx husky add .husky/pre-commit "npx frai"
```

### GitHub Actions Integration

You can automatically run FRAI checks in your CI pipeline:

1. Create a GitHub Secret called `OPENAI_API_KEY` with your OpenAI API key
2. Add the workflow file to your repository:

```yaml
# .github/workflows/frai-check.yml
name: FRAI - Responsible AI Check

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  frai-check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16.x'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run FRAI
      run: |
        node ./frai.mjs --scan --ci
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    
    - name: Upload FRAI Documentation
      uses: actions/upload-artifact@v3
      with:
        name: frai-documentation
        path: |
          checklist.md
          model_card.md
          risk_file.md
```

## 🔍 How It Works

1. **Detection**: Identifies if a commit introduces or modifies an AI feature
2. **Code Scanning**: Automatically detects AI libraries and functions
3. **Documentation**: Guides you through minimal, high-impact questions
4. **Generation**: Creates three essential markdown files
5. **AI Tips**: Provides 2-3 practical tips per category using OpenAI's API
6. **Integration**: Works with your existing workflow via pre-commit hooks, CI pipelines, or manual runs

### Automatic Code Scanning

The code scanning feature can detect:

- **AI Libraries**: TensorFlow, PyTorch, scikit-learn, Hugging Face, etc.
- **AI Functions**: fit, predict, transform, evaluate, etc.
- **Risk Patterns**: Common patterns that may require additional documentation

When running with the `--scan` option, the tool will:
1. Recursively scan your codebase for AI-related patterns
2. Generate documentation templates based on the detected patterns
3. Provide the option to refine the templates with interactive mode

## 🧠 Example Output

### checklist.md

```markdown
# Responsible AI Feature Checklist

This AI feature is mainly for internal analytics, using personal data with consent. 
Monitoring approach: user feedback.

## Tips
Checklist Tips:
- Implement a consent management system to track and verify user consent for personal data.
- Document your user feedback collection process in the README.
```

### model_card.md

```markdown
# Model Card

Model type: NLP/Language. Key metric: F1 Score. Main limitation: Data bias.

## Tips
Model Card Tips:
- Include a section on data bias in your model card, detailing specific biases identified.
- Add F1 score benchmarks for different demographic groups to identify potential disparities.
```

## 📊 Metrics & KPIs

The framework tracks three key ethical KPIs:
1. **Model Transparency**: Presence of model documentation
2. **Bias & Fairness**: Consideration of potential biases
3. **Monitoring Setup**: Implementation of feedback mechanisms

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for responsible AI development. 