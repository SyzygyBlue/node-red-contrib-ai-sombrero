// Import required modules
const path = require('path');

// Add the project root to the module path
const projectRoot = path.resolve(__dirname, '../../../../');
require('app-module-path').addPath(projectRoot);

// Import components using module paths
const { RoleManager, defaultRoleManager } = require('nodes/llm-connector/lib/prompt/role-manager');
const MessageFormatter = require('nodes/llm-connector/lib/prompt/message-formatter');
const PromptBuilder = require('nodes/llm-connector/lib/prompt/prompt-builder');
const { 
  validateTemplate, 
  renderTemplate, 
  extractVariables 
} = require('nodes/llm-connector/lib/prompt/template-utils');

// Create a template utils object to match the expected interface
const template = {
  validate: validateTemplate,
  render: renderTemplate,
  extractVariables
};

// Create a default prompt builder for testing
const defaultPromptBuilder = new PromptBuilder(defaultRoleManager);

describe('Prompt System', () => {
  describe('Template Utilities', () => {
    test('should validate template syntax', () => {
      expect(() => template.validate('Hello {{name}}')).not.toThrow();
      expect(() => template.validate('Hello {{name}')).toThrow();
    });

    test('should render template with variables', () => {
      const result = template.render('Hello {{name}}', { name: 'World' });
      expect(result).toBe('Hello World');
    });

    test('should extract variables from template', () => {
      const vars = template.extractVariables('Hello {{name}}, welcome to {{app}}!');
      expect(Array.from(vars)).toEqual(['name', 'app']);
    });
  });

  describe('Role Manager', () => {
    let roleManager;

    beforeEach(() => {
      roleManager = new RoleManager({
        system: {
          template: 'You are a {{role}}.',
          variables: { role: 'helpful assistant' }
        },
        translator: {
          inherits: 'system',
          template: 'Translate the following {{sourceLang}} text to {{targetLang}}:\n\n{{content}}',
          variables: { sourceLang: 'English', targetLang: 'Spanish' }
        }
      });
    });

    test('should get role with inherited properties', () => {
      const role = roleManager.getRole('translator');
      expect(role.template).toContain('Translate the following');
      expect(role.variables.role).toBe('helpful assistant');
    });

    test('should detect circular inheritance', () => {
      roleManager.roles.a = { inherits: 'b' };
      roleManager.roles.b = { inherits: 'c' };
      roleManager.roles.c = { inherits: 'a' };
      
      expect(() => roleManager.getRole('a')).toThrow('Circular role inheritance');
    });
  });

  describe('Message Formatter', () => {
    const roleManager = new RoleManager({
      system: {
        template: 'System: {{content}}',
        variables: { tone: 'professional' }
      },
      user: {
        template: 'User ({{tone}}): {{content}}',
        variables: { tone: 'neutral' }
      }
    });

    const formatter = new MessageFormatter(roleManager);

    test('should format message with role template', () => {
      const message = { content: 'Hello', tone: 'friendly' };
      const result = formatter.formatMessage(message, 'user');
      expect(result).toBe('User (friendly): Hello');
    });
  });

  describe('Prompt Builder', () => {
    test('should build prompt from message object', () => {
      const message = {
        _llm: {
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello, world!' }
          ]
        },
        content: 'Hello, world!',
        payload: 'Hello, world!'
      };
      
      const prompt = defaultPromptBuilder.buildPrompt(message);
      expect(prompt).toContain('Hello, world!');
    });

    test('should validate prompt', () => {
      const message = {
        _llm: {
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello, world!' }
          ]
        },
        content: 'Hello, world!',
        payload: 'Hello, world!'
      };
      
      const result = defaultPromptBuilder.validatePrompt(message);
      expect(result.valid).toBe(true);
    });

    test('should fail validation for invalid message', () => {
      const result = defaultPromptBuilder.validatePrompt({});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('message must contain');
    });
  });
});
