# Node-RED AI Workflow Orchestration

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
