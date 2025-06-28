// Mock LLM service for testing
const mockLLMResponse = {
  text: 'Test response from LLM',
  model: 'test-model',
  usage: {
    prompt_tokens: 10,
    completion_tokens: 5,
    total_tokens: 15
  },
  finish_reason: 'stop'
};

const mockLLMError = new Error('LLM service error');

const llmService = {
  callLLM: jest.fn().mockResolvedValue(mockLLMResponse),
  __setMockResponse: (response) => {
    mockLLMResponse.text = response.text || mockLLMResponse.text;
    mockLLMResponse.model = response.model || mockLLMResponse.model;
    mockLLMResponse.usage = response.usage || mockLLMResponse.usage;
    mockLLMResponse.finish_reason = response.finish_reason || mockLLMResponse.finish_reason;
  },
  __setMockError: (error) => {
    mockLLMError.message = error.message || mockLLMError.message;
    mockLLMError.code = error.code;
    mockLLMError.status = error.status;
    llmService.callLLM.mockRejectedValue(mockLLMError);
  },
  __resetMocks: () => {
    llmService.callLLM.mockClear().mockResolvedValue(mockLLMResponse);
  }
};

// Set default mock implementation
llmService.__resetMocks();

module.exports = llmService;
