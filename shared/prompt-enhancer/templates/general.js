module.exports = {
    name: 'general',
    description: 'General purpose prompt enhancement template.',
    template: `You are an AI assistant tasked with enhancing user prompts.
Your goal is to make the original prompt more effective based on the provided instructions.

Original Prompt: "{{original}}"
Instructions for Enhancement: "{{instructions}}"

Based on the above, provide the enhanced prompt. Only output the enhanced prompt, no conversational text.`,
    variables: ['original', 'instructions'],
};
