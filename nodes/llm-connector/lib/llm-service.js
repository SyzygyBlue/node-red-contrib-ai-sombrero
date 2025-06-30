// Stub for LLMService to satisfy require in tests
// Tests will mock this module via jest.mock
module.exports = {
  LLMService: {
    getLLM: () => {
      throw new Error('LLMService.getLLM not implemented');
    }
  }
};
