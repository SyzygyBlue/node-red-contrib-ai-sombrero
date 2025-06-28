const { PromptEnricher } = require('../../../../../nodes/llm-connector/lib/prompt');

// Mock LLM provider
const mockLLM = {
  generate: jest.fn()
};

describe('PromptEnricher', () => {
  let enricher;
  
  beforeEach(() => {
    jest.clearAllMocks();
    enricher = new PromptEnricher(mockLLM);
    
    // Default mock implementation
    mockLLM.generate.mockResolvedValue({
      text: 'Enriched prompt with additional context',
      usage: { total_tokens: 42 }
    });
  });

  describe('enrich', () => {
    it('should enrich a prompt with context', async () => {
      const prompt = 'Tell me about AI';
      const context = {
        role: 'assistant',
        metadata: { topic: 'artificial intelligence' }
      };
      
      const result = await enricher.enrich(prompt, context);
      
      expect(result).toBe('Enriched prompt with additional context');
      expect(mockLLM.generate).toHaveBeenCalledWith({
        prompt: expect.stringContaining('Tell me about AI'),
        max_tokens: expect.any(Number),
        temperature: expect.any(Number),
        stop: ['"""']
      });
    });

    it('should handle empty context', async () => {
      const prompt = 'Simple prompt';
      await enricher.enrich(prompt);
      
      expect(mockLLM.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('No additional context provided')
        })
      );
    });

    it('should return original prompt on error', async () => {
      mockLLM.generate.mockRejectedValue(new Error('LLM error'));
      const prompt = 'Failing prompt';
      
      const result = await enricher.enrich(prompt);
      
      expect(result).toBe(prompt);
    });
  });

  describe('batchEnrich', () => {
    it('should enrich multiple prompts', async () => {
      const prompts = ['one', 'two', 'three'];
      const results = await enricher.batchEnrich(prompts);
      
      expect(results).toHaveLength(3);
      expect(mockLLM.generate).toHaveBeenCalledTimes(3);
    });
  });
});
