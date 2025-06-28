# LLM Connector Node

A Node-RED node that provides a unified interface to interact with various Large Language Model (LLM) providers.

## Features

- **Multiple LLM Providers**: Connect to various LLM providers (OpenAI, Anthropic, Azure, etc.)
- **Prompt Enhancement**: Improve your prompts with AI assistance
- **Role-based Templates**: Define and use custom roles for different tasks
- **Context Management**: Add context to guide the LLM's responses
- **Variable Insertion**: Easily insert variables into your prompts
- **Connection Testing**: Verify your LLM configuration before use
- **Debug Mode**: Get detailed logs for troubleshooting

## Installation

1. Install the `node-red-contrib-llm` package:
   ```bash
   npm install node-red-contrib-llm
   ```

2. Restart Node-RED and the node will appear in the "LLM" category of your palette.

## Usage

### Basic Configuration

1. Add an LLM Connector node to your flow
2. Select or create an LLM Config node to connect to your preferred LLM provider
3. Enter your prompt or use the "Enhance" button to improve it with AI
4. (Optional) Select a role template to guide the LLM's behavior
5. (Optional) Add context to provide additional information to the LLM

### Input/Output

- **Input**: Any valid Node-RED message with a `msg.payload`
- **Output 1 (success)**: The LLM's response in `msg.payload` with metadata in `msg._llm`
- **Output 2 (error)**: Error information if the LLM call fails

## Node Properties

- **Name**: A friendly name for the node
- **LLM Configuration**: The LLM Config node to use for this connection
- **Prompt**: The text prompt to send to the LLM
- **Role**: A predefined role template to guide the LLM's responses
- **Context**: Additional context to provide to the LLM
- **Debug Mode**: Enable detailed logging for troubleshooting

## Advanced Usage

### Using Variables

You can use handlebar-style variables in your prompts:

```
Hello {{name}}, how can I help you today?
```

Variables will be replaced with values from `msg.vars` or `msg.payload`.

### Response Schema Validation

You can validate the LLM's response against a JSON Schema:

```javascript
msg._llm = {
  responseSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" }
    },
    required: ["name"]
  }
};
return msg;
```

### Debugging

Enable debug mode to see detailed logs in the Node-RED debug panel. The logs include:

- Request/response payloads
- Token usage
- Processing times
- Any errors that occur

## Examples

### Basic Chat

1. Add an "inject" node with a string payload (e.g., "Tell me a joke")
2. Connect it to an LLM Connector node
3. Connect the LLM Connector to a "debug" node
4. Deploy and click the inject button

### Role-based Response

1. Create a new role template called "Poet" with instructions to respond in rhyme
2. Configure the LLM Connector to use the "Poet" role
3. Send a message and receive a poetic response

## Troubleshooting

### Common Issues

- **Connection failed**: Verify your API key and endpoint in the LLM Config node
- **No response**: Check the Node-RED logs for errors
- **Unexpected output**: Try being more specific in your prompt or adjust the temperature

### Getting Help

For additional assistance, please [open an issue](https://github.com/your-repo/node-red-contrib-llm/issues) on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
