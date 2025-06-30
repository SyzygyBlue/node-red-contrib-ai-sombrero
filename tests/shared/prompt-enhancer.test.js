const { createPromptEnhancer } = require('shared/prompt-enhancer');


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
    
    enhancer = createPromptEnhancer({
      llmProvider: mockLLM,
      context: 'general',
      defaults: { maxTokens: 300 }
    });
  });
  
  describe('initialization', () => {
    it('should initialize with default context', () => {
      const defaultEnhancer = createPromptEnhancer({ llmProvider: mockLLM });
      expect(defaultEnhancer.context).toBe('general');
    });
    
    it('should throw error without LLM provider', () => {
      expect(() => createPromptEnhancer()).toThrow('llmProvider function is required.');
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
        maxTokens: 300
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
        maxTokens: 500,
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
      
      expect(typeof mcpEnhancer.enhance).toBe('function');
      expect(typeof mcpEnhancer.withContext).toBe('function');
      expect(mcpEnhancer.context).toBe('mcpNode');
      expect(mcpEnhancer.llmProvider).toBe(enhancer.llmProvider);
    });
  });
});

describe('createPromptEnhancer function', () => {
  it('should create a new PromptEnhancer instance', () => {
    const enhancer = createPromptEnhancer({ llmProvider: mockLLM });
    
    // We can't directly check for 'instanceof PromptEnhancer' if the class isn't exported.
    // Instead, we check for the expected methods.
    expect(typeof enhancer.enhance).toBe('function');
    expect(typeof enhancer.withContext).toBe('function');
    expect(enhancer.context).toBe('general'); // Default context
  });
});
