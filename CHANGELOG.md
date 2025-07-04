# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2025-07-04
### Added
- Dynamic output count & labels in MCP node definition ensuring ports persist across editor refresh.
- Auto-sync of rule labels to output tool-tips in MCP rules editor.
### Fixed
- Editor warning "node.wires longer than node.outputs" and disappearing wires.
- Rules without explicit `output` or `type` now default correctly in runtime routing service.

## [0.3.0] - 2025-07-04
### Added
- **Robust JSON extraction** in LLM Connector output processor using balanced-bracket scanning to reliably parse objects/arrays embedded in LLM responses.
- Recursive normalization of nested `choices/message.content`, `text`, and other wrapper fields.
- Diagnostic return when JSON is invalid (`format: invalid_json`) to aid downstream debugging.
- Automatic promotion of credentialed `apiKey` to top-level during config validation for OpenAI and other providers.
- New Ollama model suggestion `mixtral` in LLM Config UI.
- Local **Ollama (local)** provider support in the LLM Config node
  - New `callOllama` helper and connectivity test
  - Provider option & model suggestions in the editor UI
- Default model suggestions for popular open-source models (`deepseek-r1`, `mistral:7b-instruct`, `llama3:8b`, `codellama:7b-instruct`, `devstral:28b`).
### Changed
- LLM Config editor hides the API-Key field when Ollama is selected.
### Fixed
- Standardised helper return format (`{ text }`) for Ollama responses to match other providers.


## [0.2.7] - 2025-07-02
### Added
- Role Manager UI with REST-based CRUD operations and AI-driven prompt enhancement.
### Changed
- Aligned UI/backend parameter names (`dbConfigId`/`roleData`).
### Fixed
- Automatic SQLite schema migration adds missing `system_prompt` column to `roles`.

### Added
- **MCP Node**
  - Dynamic output generation with AI-powered and rule-based routing
  - Message enhancement pipeline with context enrichment and transformations
  - Integration with the prompt enhancer module
  - Comprehensive decision logging and debugging features
- **Database Config Node**
  - Configuration for database connections

### Changed
- N/A

### Fixed
- Stabilized MCP node and LLM connector unit tests, resolved Jest module resolution and mock scope issues.

### Removed
- N/A

## [0.2.0] - 2025-06-30

### Added
- **LLM Connector Node**
  - Integration with LLM Config node for provider settings
  - Role-based message processing (assistant, summarizer, etc.)
  - Debug mode with detailed logging
  - Comprehensive error handling with separate error output
  - Audit logging for all LLM interactions
  - Support for custom roles and prompts
  - Example flow for chat applications
  - Unit and integration tests

- LLM Config node for managing LLM provider configurations
  - Support for multiple providers (OpenAI, Anthropic, Azure, Custom)
  - Secure credential management with encryption
  - Dynamic UI based on provider selection
  - Connection testing functionality
  - Audit logging for security events
- Audit service for logging security-relevant events
- Comprehensive test suite for LLM Config node

## [0.1.0] - 2025-06-27

### Added
- Initial project setup with Node-RED node structure
- GitHub Actions CI/CD pipeline with test, build, and release workflows
- Development environment with Docker and PostgreSQL
- Code quality tools: ESLint, Prettier, and Jest
- Basic project documentation

### Changed
- N/A

### Fixed
- N/A

### Removed
- N/A
