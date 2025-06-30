# Node-RED AI Sombrero

[![CI](https://github.com/SyzygyBlue/node-red-contrib-ai-sombrero/actions/workflows/ci.yml/badge.svg)](https://github.com/SyzygyBlue/node-red-contrib-ai-sombrero/actions/workflows/ci.yml) [![Keep a Changelog](https://img.shields.io/badge/Changelog-Keep%20a%20Changelog-%23E05735)](CHANGELOG.md)

AI Sombrero is a plug-and-play orchestration toolkit for Node-RED that enables large language models (LLMs) to work together like a team of expert agents—each wearing a different "hat."

With support for OpenAI, Anthropic, Gemini, and other LLMs, this project introduces:

Role-based LLM connector nodes that behave like software architects, project managers, or devops engineers—each with its own prompt stack and decision logic.

The MCP (“Master Control Program”) node—the Sombrero—which routes tasks intelligently to the right expert.

Persistent task queues, dead-letter recovery, and retry logic.

Modular backend services for databases, audits, queues, and AI integrations.

Built-in observability, testing, and CI/CD support for production-grade deployment.

Inspired by the power of prompt specialization and multi-agent coordination, AI Sombrero makes Node-RED a serious platform for composable, AI-assisted workflows and task decomposition pipelines.

Whether you're building autonomous task agents, document processors, or intelligent automation chains—put a hat on it and let the Sombrero drive.

## 🚀 LLM Connector Node

The LLM Connector node enables seamless integration with various LLM providers using configurations from the LLM Config node. It handles message processing, role-based interactions, and error handling.

### Features

- **Multiple LLM Providers**: Connect to OpenAI, Anthropic, Azure OpenAI, and custom endpoints
- **Role-Based Processing**: Define different roles (assistant, summarizer, etc.) for different use cases
- **Debug Mode**: Enable detailed logging and metadata for troubleshooting
- **Error Handling**: Comprehensive error handling with detailed error messages
- **Audit Logging**: Track all LLM interactions for monitoring and debugging

### Installation

1. Install the package in your Node-RED environment:
   ```bash
   npm install node-red-contrib-ai-sombrero
   ```
2. Restart Node-RED
3. The LLM nodes will be available in the "LLM" category in the node palette

### Usage

1. **Add an LLM Config Node**
   - Configure your LLM provider settings (API key, endpoint, etc.)
   - Test the connection to ensure it works

2. **Add an LLM Connector Node**
   - Connect it to your LLM Config node
   - Select a role for the LLM (e.g., assistant, summarizer)
   - Enable debug mode if needed

3. **Send Messages**
   - Send messages to the node's input
   - The LLM's response will be available at the first output
   - Any errors will be sent to the second output

### Example Flow

Here's a simple example that uses the LLM Connector to process a message:

```json
[
  {
    "id": "llm-config-1",
    "type": "llm-config",
    "name": "OpenAI Config",
    "provider": "openai",
    "model": "gpt-4"
  },
  {
    "id": "llm-connector-1",
    "type": "llm-connector",
    "name": "AI Assistant",
    "llmConfig": "llm-config-1",
    "role": "assistant",
    "debug": true,
    "wires": [
      ["output-1"],
      ["error-handler"]
    ]
  },
  {
    "id": "inject-1",
    "type": "inject",
    "name": "Send Message",
    "payload": "Hello, how are you?",
    "topic": "greeting",
    "wires": [
      ["llm-connector-1"]
    ]
  },
  {
    "id": "output-1",
    "type": "debug",
    "name": "LLM Response",
    "active": true,
    "complete": "payload",
    "console": "false"
  },
  {
    "id": "error-handler",
    "type": "debug",
    "name": "Error Handler",
    "active": true,
    "complete": "payload",
    "console": "false"
  }
]
```

### Configuration

#### LLM Connector Node

- **Name**: A friendly name for the node
- **LLM Config**: Select a configured LLM Config node
- **Role**: The role for the LLM (e.g., assistant, summarizer)
- **Debug**: Enable to include additional debug information in the output

### Output

The LLM Connector node has two outputs:

1. **First Output (Success)**: Contains the LLM's response with the following structure:
   ```javascript
   {
     payload: "LLM response text",
     _llmMetadata: {
       provider: "openai",
       model: "gpt-4",
       tokens: 15,
       completionTokens: 5,
       promptTokens: 10,
       processingTime: 1234
     },
     _debug: {
       // Debug information if enabled
     }
   }
   ```

2. **Second Output (Error)**: Contains error information if the request fails

### Error Handling

- Invalid configurations are caught during node initialization
- LLM API errors are caught and sent to the second output
- All errors include detailed error messages for debugging

### Best Practices

1. **Use Environment Variables** for sensitive information like API keys
2. **Enable Debug Mode** when developing or troubleshooting
3. **Implement Error Handling** to gracefully handle API failures
4. **Monitor Usage** with the built-in audit logging
5. **Test Thoroughly** with different message types and edge cases

## 🎩 MCP Node

The Master Control Program (MCP) node, also known as the Sombrero, is designed for intelligent routing and orchestration of AI workflows. It dynamically routes messages based on AI-powered decisions or predefined rules, enhancing messages through a configurable pipeline.

### Features

- **Dynamic Routing**: Route messages based on AI insights or explicit rules.
- **Message Enhancement**: Enrich and transform messages using a configurable pipeline.
- **Prompt Enhancer Integration**: Seamlessly integrate with the shared prompt enhancer module.
- **Decision Logging**: Comprehensive logging of routing decisions and message transformations for debugging and auditing.

### Usage

1. **Configure Routing**: Define AI-powered routing logic or rule-based conditions within the node's configuration.
2. **Connect Inputs/Outputs**: Connect the MCP node to upstream and downstream nodes in your Node-RED flow.
3. **Monitor Decisions**: Utilize the debug output to observe routing decisions and message transformations.

## 🗄️ Database Config Node

The Database Config node provides a centralized way to manage database connections within your Node-RED flows. It supports various database types and ensures secure handling of credentials.

### Features

- **Centralized Configuration**: Define and reuse database connection settings across multiple nodes.
- **Secure Credential Management**: Encrypt and securely store database credentials.
- **Connection Testing**: Verify database connectivity directly from the Node-RED editor.

### Usage

1. **Add a Database Config Node**: Configure your database type, host, port, credentials, and other settings.
2. **Reference in Other Nodes**: Use this configuration node in other Node-RED nodes that require database access.

## 🛠️ Development

### GitHub Repository

This project is hosted on GitHub at:
[github.com/SyzygyBlue/node-red-contrib-ai-sombrero](https://github.com/SyzygyBlue/node-red-contrib-ai-sombrero)

### Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/node-red-contrib-ai-sombrero.git
   cd node-red-contrib-ai-sombrero
   ```
3. **Create a new branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Make your changes** and test them
6. **Run tests** to ensure everything works:
   ```bash
   npm test
   ```
7. **Commit your changes** with a descriptive message:
   ```bash
   git commit -m "Add: Description of your changes"
   ```
8. **Push to your fork** and create a Pull Request

### Development Setup

1. **Link the package** for local development:
   ```bash
   npm link
   cd ~/.node-red
   npm link node-red-contrib-ai-sombrero
   ```

2. **Start Node-RED** with your local changes:
   ```bash
   node-red
   ```

### Building for Release

To create a new release:

1. Update the version in `package.json` following [semantic versioning](https://semver.org/)
2. Update `CHANGELOG.md` with the changes
3. Build the package:
   ```bash
   npm run build
   ```
4. Create a git tag for the release:
   ```bash
   git tag -a v1.0.0 -m "Version 1.0.0"
   git push origin v1.0.0
   ```
5. Publish to npm (if you have permissions):
   ```bash
   npm publish
   ```

## 📦 Project Structure

```
.
├── nodes/                    # Node-RED node implementations
│   ├── llm-connector/
│   ├── mcp-node/
│   └── dbconfig-node/
├── shared/                   # Shared modules and services (e.g., prompt-enhancer)
├── tests/                    # Test files
├── docker/                   # Docker-related files
├── project-tasks/            # Project task documentation
└── .gitignore                # Git ignore file
```

## 📜 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed record of all notable changes to this project.

## 🚀 Getting Started

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
