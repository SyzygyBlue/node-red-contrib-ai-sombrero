class MockLLMClient {
  constructor(config) {
    if (!config || !config.apiKey) {
      throw new Error('OpenAI configuration requires an API key');
    }
    this.complete = jest.fn().mockResolvedValue({ text: 'Mock response' });
    this.close = jest.fn().mockResolvedValue(undefined);
  }
}

module.exports = MockLLMClient;
