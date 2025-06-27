# Node-RED AI Sombrero

AI Sombrero is a plug-and-play orchestration toolkit for Node-RED that enables intelligent automation chains—put a hat on it and let the Sombrero drive.

A powerful, modular AI workflow orchestration system built on Node-RED with support for multiple LLM providers, database backends, and queue management.

## Project Structure

```
.
├── src/                    # Source code
│   ├── nodes/              # Node-RED node implementations
│   ├── helpers/            # Helper functions
│   ├── services/           # Shared services
│   └── utils/              # Utility functions
├── tests/                  # Test files
├── docs/                   # Documentation
└── .gitignore             # Git ignore file
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 8+
- Docker (for development environment)
- PostgreSQL (or use Docker)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd node-red-ai-workflow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development environment:
   ```bash
   docker-compose up -d
   ```

## Development

### Code Style

We use ESLint and Prettier for code formatting. Before committing, run:

```bash
npm run format
npm run lint
```

### Testing

Run tests with:

```bash
npm test
```

## License

MIT
=======
# node-red-contrib-ai-sombrero
AI Sombrero is a plug-and-play orchestration toolkit for Node-RED that enables large language models (LLMs) to work together like a team of expert agents—each wearing a different "hat."

With support for OpenAI, Anthropic, Gemini, and other LLMs, this project introduces:

Role-based LLM connector nodes that behave like software architects, project managers, or devops engineers—each with its own prompt stack and decision logic.

The MCP (“Master Control Program”) node—the Sombrero—which routes tasks intelligently to the right expert.

Persistent task queues, dead-letter recovery, and retry logic.

Modular backend services for databases, audits, queues, and AI integrations.

Built-in observability, testing, and CI/CD support for production-grade deployment.

Inspired by the power of prompt specialization and multi-agent coordination, AI Sombrero makes Node-RED a serious platform for composable, AI-assisted workflows and task decomposition pipelines.

Whether you're building autonomous task agents, document processors, or intelligent automation chains—put a hat on it and let the Sombrero drive.
>>>>>>> 7bf382dd706d74f7537555d0e9632dcd73197275
