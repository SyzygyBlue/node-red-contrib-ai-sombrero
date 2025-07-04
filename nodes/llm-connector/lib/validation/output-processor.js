/**
 * Output Processor
 * Handles processing and normalizing LLM outputs
 */

const { LLMError, ERROR_CODES } = require('./error-types');
const { handleLLMError } = require('../utils/error-handler');

/**
 * Attempts to extract a syntactically balanced JSON object or array from raw text.
 * Returns the substring if found, else null.
 * Ignores braces/brackets inside quoted strings and handles escapes.
 * @param {string} str
 * @returns {string|null}
 */
function extractBalancedJSON(str) {
  const firstObj = str.indexOf('{');
  const firstArr = str.indexOf('[');
  let start = -1;
  if (firstObj === -1 && firstArr === -1) return null;
  if (firstObj === -1 || (firstArr !== -1 && firstArr < firstObj)) {
    start = firstArr;
  } else {
    start = firstObj;
  }
  const stack = [];
  let inString = false;
  let escape = false;
  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') {
      stack.push('}');
    } else if (ch === '[') {
      stack.push(']');
    } else if (ch === '}' || ch === ']') {
      if (!stack.length) return null;
      const expected = stack.pop();
      if (expected !== ch) return null;
      if (!stack.length) return str.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Normalizes LLM output to a standard format
 * @param {*} rawOutput - Raw output from the LLM
 * @param {Object} options - Processing options
 * @returns {Object} Normalized output
 * @throws {LLMError} If output cannot be normalized
 */
function normalizeLLMOutput(rawOutput, options = {}) {
  try {
    // Handle different types of outputs
    if (rawOutput === undefined || rawOutput === null) {
      throw new LLMError('LLM returned no output', ERROR_CODES.PROCESSING_ERROR);
    }

    // If it's an object, try to extract the content
    if (typeof rawOutput === 'object' && rawOutput !== null) {
      // Attempt to drill into known response wrappers and then recursively
      // normalize the extracted string so that headers / fenced blocks are
      // stripped just as they would be for a top-level string.
      let innerContent = null;
      if (rawOutput.choices && rawOutput.choices.length > 0 && rawOutput.choices[0].message && rawOutput.choices[0].message.content) {
        innerContent = rawOutput.choices[0].message.content;
      } else if (typeof rawOutput.content === 'string') {
        innerContent = rawOutput.content;
      } else if (typeof rawOutput.text === 'string') {
        innerContent = rawOutput.text;
      }

      if (typeof innerContent === 'string') {
        // Recurse so heuristics for fenced JSON, key/value pairs, etc. are applied
        return normalizeLLMOutput(innerContent, options);
      }

      // As a last resort, return a shallow clone of the original object
      return { ...rawOutput };
    }

    // If it's a string, try to parse it as JSON
    if (typeof rawOutput === 'string') {
      try {
        // Try to parse as JSON first
        return JSON.parse(rawOutput);
      } catch (e) {
        // 0. Try balanced-bracket extraction first
        const balanced = extractBalancedJSON(rawOutput);
        if (balanced) {
          try {
            return JSON.parse(balanced);
          } catch (_) {
            // fall-through to other heuristics
          }
        }

        // Attempt to build object from key-value lines
        // Attempt to extract JSON enclosed in code fences or following a header
        const fenced = rawOutput.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
        let jsonCandidate = fenced ? fenced[1] : null;
        if (!jsonCandidate) {
          const firstBrace = rawOutput.indexOf('{');
          const lastBrace = rawOutput.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonCandidate = rawOutput.substring(firstBrace, lastBrace + 1);
          }
        }
        if (jsonCandidate) {
          try {
            return JSON.parse(jsonCandidate);
          } catch (_) {
            // Ignore and continue with other heuristics
          }
        }

        const lines = rawOutput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const kvRegex = /^([A-Za-z0-9_ -]+)\s*[:=]\s*(.+)$/;
        if (lines.length > 1 && lines.every(l => kvRegex.test(l))) {
          const obj = {};
          for (const l of lines) {
            const [, k, v] = l.match(kvRegex);
            obj[k.trim().replace(/\s+/g, '_')] = v.trim();
          }
          return obj;
        }

        // Detect simple bullet / numbered list -> array
        const bulletRegex = /^(?:[-*+]\s+|\d+\.\s+)/;
        if (lines.length > 1 && lines.every(l => bulletRegex.test(l))) {
          return lines.map(l => l.replace(bulletRegex, '').trim());
        }

        // Fallback: plain message
        return { message: rawOutput };
      }
    }

    // For any other type, convert to string
    return { value: String(rawOutput) };
  } catch (error) {
    const { error: llmError } = handleLLMError(error, {
      event: 'output_normalization_error',
      outputType: rawOutput ? typeof rawOutput : 'undefined'
    });
    
    throw llmError;
  }
}

/**
 * Validates the output against a schema
 * @param {Object} output - The output to validate
 * @param {Object} schema - The schema to validate against
 * @returns {Object} Validation result
 */
function validateOutput(output, schema) {
  // If no schema is provided, consider it valid
  if (!schema) {
    return { valid: true };
  }

  try {
    // Use the schema validator from our validation module
    const { validateSchema } = require('./schema-validator');
    return validateSchema(output, schema);
  } catch (error) {
    return {
      valid: false,
      error: new LLMError(
        'Schema validation failed',
        ERROR_CODES.SCHEMA_VALIDATION_ERROR,
        { originalError: error }
      )
    };
  }
}

/**
 * Processes the LLM output with optional validation
 * @param {*} rawOutput - Raw output from the LLM
 * @param {Object} options - Processing options
 * @returns {Object} Processed output
 * @throws {LLMError} If processing fails
 */
function processLLMOutput(rawOutput, options = {}) {
  try {
    const { schema, validate = true } = options;
    
    // Normalize the output
    const normalized = normalizeLLMOutput(rawOutput, options);
    
    // Validate against schema if provided
    if (validate && schema) {
      const { valid, error } = validateOutput(normalized, schema);
      if (!valid) {
        throw error || new LLMError(
          'Output validation failed',
          ERROR_CODES.SCHEMA_VALIDATION_ERROR
        );
      }
    }
    
    return normalized;
  } catch (error) {
    const { error: llmError } = handleLLMError(error, {
      event: 'output_processing_error',
      hasSchema: !!options.schema
    });
    
    throw llmError;
  }
}

module.exports = {
  normalizeLLMOutput,
  validateOutput,
  processLLMOutput
};
