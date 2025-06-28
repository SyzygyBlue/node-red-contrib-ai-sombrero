const { PromptEnhancer } = require('../../nodes/shared/prompt-enhancer');

// Mock LLM provider
const mockLLM = jest.fn();

describe('PromptEnhancer', () => {
  let enhancer;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockLLM.mockResolvedValue({
      text: 'Enhanced prompt with additional context',
      usage: { total_tokens: 42 }
    });
    
    enhancer = new PromptEnhancer({
      llmProvider: mockLLM,
      context: 'llmConnector',
      defaults: { maxTokens: 300 }
    });
  });
  
  describe('constructor', () => {
    it('should initialize with default context', () => {
      const defaultEnhancer = new PromptEnhancer({ llmProvider: mockLLM });
      expect(defaultEnhancer.context).toBe('general');
    });
    
    it('should throw error without LLM provider', () => {
      expect(() => new PromptEnhancer()).toThrow('LLM provider function is required');
    });
  });
  
  describe('enhance', () => {
    it('should enhance a prompt with instructions', async () => {
      const original = 'Tell me about AI';
      const instructions = 'Make it more detailed';
      
      const result = await enhancer.enhance(original, instructions);
      
      expect(result).toBe('Enhanced prompt with additional context');
      expect(mockLLM).toHaveBeenCalledWith({
        prompt: expect.stringContaining(original),
        max_tokens: 300,
        temperature: 0.7,
        stop: expect.any(Array)
      });
    });
    
    it('should use custom options when provided', async () => {
      const original = 'Simple prompt';
      const instructions = 'Enhance this';
      
      await enhancer.enhance(original, instructions, {
        maxTokens: 500,
        temperature: 0.9
      });
      
      expect(mockLLM).toHaveBeenCalledWith(expect.objectContaining({
        max_tokens: 500,
        temperature: 0.9
      }));
    });
    
    it('should return original prompt on error', async () => {
      mockLLM.mockRejectedValue(new Error('LLM error'));
      const original = 'Failing prompt';
      
      const result = await enhancer.enhance(original, 'fail please');
      
      expect(result).toBe(original);
    });
  });
  
  describe('withContext', () => {
    it('should create a new instance with different context', () => {
      const mcpEnhancer = enhancer.withContext('mcpNode');
      
      expect(mcpEnhancer).toBeInstanceOf(PromptEnhancer);
      expect(mcpEnhancer.context).toBe('mcpNode');
      expect(mcpEnhancer.llmProvider).toBe(enhancer.llmProvider);
    });
  });
});

describe('createPromptEnhancer', () => {
  it('should create a new PromptEnhancer instance', () => {
    const { createPromptEnhancer } = require('../../nodes/shared/prompt-enhancer');
    const enhancer = createPromptEnhancer({ llmProvider: mockLLM });
    
    expect(enhancer).toBeInstanceOf(PromptEnhancer);
  });
});
