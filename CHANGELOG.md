# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
