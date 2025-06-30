const { createPromptEnhancer } = require('../index');

describe('PromptEnhancer', () => {
    let mockLlmProvider;
    let enhancer;

    beforeEach(() => {
        mockLlmProvider = jest.fn();
        enhancer = createPromptEnhancer({
            llmProvider: mockLlmProvider,
            context: 'general',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create an enhancer instance', () => {
        expect(enhancer).toBeDefined();
        expect(typeof enhancer.enhance).toBe('function');
        expect(typeof enhancer.withContext).toBe('function');
    });

    it('should enhance a prompt using the general template', async () => {
        const originalPrompt = 'Summarize this text.';
        const instructions = 'Make it concise and highlight key points.';
        const expectedPrompt = `You are an AI assistant tasked with enhancing user prompts.\nYour goal is to make the original prompt more effective based on the provided instructions.\n\nOriginal Prompt: "${originalPrompt}"\nInstructions for Enhancement: "${instructions}"\n\nBased on the above, provide the enhanced prompt. Only output the enhanced prompt, no conversational text.`;

        mockLlmProvider.mockResolvedValueOnce({ text: 'Enhanced summary.' });

        const enhancedText = await enhancer.enhance(originalPrompt, instructions);

        expect(mockLlmProvider).toHaveBeenCalledTimes(1);
        expect(mockLlmProvider).toHaveBeenCalledWith({
            prompt: expectedPrompt,
        });
        expect(enhancedText).toBe('Enhanced summary.');
    });

    it('should return the original prompt on LLM provider error', async () => {
        const originalPrompt = 'Summarize this text.';
        const instructions = 'Make it concise and highlight key points.';

        mockLlmProvider.mockRejectedValueOnce(new Error('LLM API Error'));

        const enhancedText = await enhancer.enhance(originalPrompt, instructions);

        expect(mockLlmProvider).toHaveBeenCalledTimes(1);
        expect(enhancedText).toBe(originalPrompt);
    });

    it('should create a new instance with a different context', () => {
        const newEnhancer = enhancer.withContext('llmConnector');
        expect(newEnhancer).toBeDefined();
        expect(newEnhancer).not.toBe(enhancer); // Should be a new instance
        // Further tests would verify that the new context is used for templating
    });
});
