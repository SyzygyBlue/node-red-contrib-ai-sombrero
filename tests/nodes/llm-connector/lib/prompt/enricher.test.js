// Import required modules
const path = require('path');

// Add the project root to the module path
const projectRoot = path.resolve(__dirname, '../../../../../');
require('app-module-path').addPath(projectRoot);

const { createPromptEnhancer } = require('shared/prompt-enhancer');

// Mock LLM provider
const mockLLM = {
  generate: jest.fn()
};

describe('PromptEnricher', () => {
  let enricher;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockLLM.generate.mockImplementation((options) => {
      return Promise.resolve({
        text: 'Enriched prompt with additional context',
        usage: { total_tokens: 42 }
      });
    });
    enricher = createPromptEnhancer({ llmProvider: mockLLM.generate });
  });

  describe('enrich', () => {
    it('should enrich a prompt with context', async () => {
      const prompt = 'Tell me about AI';
      const context = {
        role: 'assistant',
        metadata: { topic: 'artificial intelligence' }
      };
      
      const result = await enricher.enhance(prompt, 'Enhance with AI context', context);
      
      expect(result).toBe('Enriched prompt with additional context');
      expect(mockLLM.generate).toHaveBeenCalledWith({
        prompt: expect.any(String),
        metadata: {
          topic: 'artificial intelligence'
        },
        role: 'assistant'
      });
    });

    it('should handle empty context', async () => {
      const prompt = 'Simple prompt';
      await enricher.enhance(prompt);
      
      expect(mockLLM.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Original Prompt: "Simple prompt"')
        })
      );
    });

    it('should return original prompt on error', async () => {
      mockLLM.generate.mockRejectedValue(new Error('LLM error'));
      const prompt = 'Failing prompt';
      
      const result = await enricher.enhance(prompt);
      
      expect(result).toBe(prompt);
    });
  });

  // describe('batchEnrich', () => {
  //   it('should enrich multiple prompts', async () => {
  //     const prompts = ['one', 'two', 'three'];
  //     const results = await enricher.batchEnrich(prompts);
  //     
  //     expect(results).toHaveLength(3);
  //     expect(mockLLM.generate).toHaveBeenCalledTimes(3);
  //   });
  // });
});
