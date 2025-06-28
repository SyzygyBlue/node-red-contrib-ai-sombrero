const { validateSchema, normalizeSchemaErrors } = require('../../../../../nodes/llm-connector/lib/validation');

describe('Schema Validation', () => {
  const testSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      age: { type: 'number', minimum: 0 },
      email: { type: 'string', format: 'email' }
    },
    required: ['name'],
    additionalProperties: false
  };

  describe('validateSchema', () => {
    it('should validate data against schema', () => {
      const data = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      };

      const result = validateSchema(data, testSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual(data);
    });

    it('should return errors for invalid data', () => {
      const data = {
        name: '',
        age: -5,
        email: 'not-an-email'
      };

      const result = validateSchema(data, testSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toBeNull();
    });
  });

  describe('normalizeSchemaErrors', () => {
    it('should normalize error objects', () => {
      const errors = [
        {
          instancePath: '/name',
          schemaPath: '#/properties/name/minLength',
          keyword: 'minLength',
          params: { limit: 1 },
          message: 'should NOT be shorter than 1 characters'
        }
      ];

      const normalized = normalizeSchemaErrors(errors);
      expect(normalized).toEqual([
        {
          path: '/name',
          message: 'should NOT be shorter than 1 characters',
          params: { limit: 1 },
          schemaPath: '#/properties/name/minLength',
          keyword: 'minLength',
          data: undefined
        }
      ]);
    });
  });
});
