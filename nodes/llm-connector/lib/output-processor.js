/**
 * Output Processor
 * Handles normalization and processing of LLM outputs
 */

const { auditLogger } = require('../../../services/audit-service');

/**
 * Attempts to locate a syntactically balanced JSON object or array inside a string.
 * Returns the substring if found, otherwise null.
 * This runs a lightweight stack-based scan that ignores brackets inside quoted
 * strings and properly handles escapes (e.g. \" ). It will stop once the first
 * balanced structure is complete.
 * @param {string} str
 * @returns {string|null}
 */
function extractBalancedJSON(str) {
  const firstObj = str.indexOf('{');
  const firstArr = str.indexOf('[');
  let start = -1;
  let opener;
  if (firstObj === -1 && firstArr === -1) return null;
  if (firstObj === -1 || (firstArr !== -1 && firstArr < firstObj)) {
    start = firstArr;
    opener = '[';
  } else {
    start = firstObj;
    opener = '{';
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
      if (!stack.length) return null; // unbalanced close
      const expected = stack.pop();
      if (ch !== expected) return null; // mismatch
      if (!stack.length) {
        return str.slice(start, i + 1);
      }
    }
  }
  return null;
}
const { validateSchema, normalizeSchemaErrors } = require('./schema-validator');

/**
 * Normalizes LLM output based on specified format
 * @param {*} raw - Raw LLM output
 * @param {string} format - Expected format ('json', 'text', 'markdown')
 * @returns {Object} - Normalized output { content: any, format: string, metadata: Object }
 */
function normalizeLLMOutput(raw, format = 'text') {
  try {
    // Handle undefined or null input
    if (raw === undefined || raw === null) {
      return {
        content: '',
        format: 'text',
        metadata: { normalized: false, error: 'Empty output' }
      };
    }

    // Handle string input
    if (typeof raw === 'string') {
      // --- Enhanced string normalization ---
      // 0. Attempt to locate a balanced JSON object/array anywhere in the text
      const balancedCandidate = extractBalancedJSON(raw);
      if (balancedCandidate) {
        try {
          const parsed = JSON.parse(balancedCandidate);
          return {
            content: parsed,
            format: 'json',
            metadata: { normalized: true, originalFormat: 'string', extracted: 'balanced_json' }
          };
        } catch (_) {
          // If parsing fails, continue with other heuristics
        }
      }
      // First, attempt to extract JSON that may be wrapped in markdown fences or after a header
      const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
      let jsonCandidate = fenced ? fenced[1] : null;
      if (!jsonCandidate) {
        const firstBrace = raw.indexOf('{');
        const lastBrace = raw.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonCandidate = raw.substring(firstBrace, lastBrace + 1);
        }
      }
      if (jsonCandidate) {
        try {
          const parsed = JSON.parse(jsonCandidate);
          return {
            content: parsed,
            format: 'json',
            metadata: { normalized: true, originalFormat: 'string', extracted: true }
          };
        } catch (e) {
          // Capture unparseable JSON for diagnostics
          return {
            content: jsonCandidate.trim(),
            format: 'invalid_json',
            metadata: {
              normalized: false,
              error: 'json_parse_error',
              message: e.message
            }
          }
        }
      }

      // Next, honour explicit json format hint or simple brace check
      if (format === 'json' || (raw.trim().startsWith('{') && raw.trim().endsWith('}'))) {
        try {
          const parsed = JSON.parse(raw);
          return {
            content: parsed,
            format: 'json',
            metadata: { normalized: true, originalFormat: 'string' }
          };
        } catch (e) {
          if (format === 'json') {
            throw new Error(`Failed to parse JSON output: ${e.message}`);
          }
          // fall through to heuristics
        }
      }

      // Attempt to convert key-value lines into an object
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const kvRegex = /^([A-Za-z0-9_ -]+)\s*[:=]\s*(.+)$/;
      if (lines.length > 1 && lines.every(l => kvRegex.test(l))) {
        const obj = {};
        for (const l of lines) {
          const [, k, v] = l.match(kvRegex);
          obj[k.trim().replace(/\s+/g, '_')] = v.trim();
        }
        return {
          content: obj,
          format: 'json',
          metadata: { normalized: true, originalFormat: 'string', inferred: 'kv_pairs' }
        };
      }

      // Bullet / numbered list -> array
      const bulletRegex = /^(?:[-*+]\s+|\d+\.\s+)/;
      if (lines.length > 1 && lines.every(l => bulletRegex.test(l))) {
        return {
          content: lines.map(l => l.replace(bulletRegex, '').trim()),
          format: 'array',
          metadata: { normalized: true, originalFormat: 'string', inferred: 'list' }
        };
      }

      // --- Fallbacks remain below ---
      if (format === 'json' || (raw.trim().startsWith('{') && raw.trim().endsWith('}'))) {
        try {
          const parsed = JSON.parse(raw);
          return {
            content: parsed,
            format: 'json',
            metadata: { normalized: true, originalFormat: 'string' }
          };
        } catch (e) {
          // If JSON parsing fails but format was specified as JSON, return error
          if (format === 'json') {
            throw new Error(`Failed to parse JSON output: ${e.message}`);
          }
          // Otherwise, treat as text
          return {
            content: raw,
            format: 'text',
            metadata: { normalized: true }
          };
        }
      }
      
      // Handle markdown
      if (format === 'markdown' || raw.includes('\n') || raw.includes('`') || raw.includes('#')) {
        return {
          content: raw,
          format: 'markdown',
          metadata: { normalized: true }
        };
      }

      // Default to text
      return {
        content: raw,
        format: 'text',
        metadata: { normalized: true }
      };
    }

    // Handle object input
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return {
        content: raw,
        format: 'json',
        metadata: { normalized: true }
      };
    }

    // Handle array input
    if (Array.isArray(raw)) {
      return {
        content: raw,
        format: 'array',
        metadata: { normalized: true }
      };
    }

    // For any other type, convert to string
    return {
      content: String(raw),
      format: 'text',
      metadata: { normalized: true, originalType: typeof raw }
    };
  } catch (error) {
    auditLogger.error({
      event: 'output_normalization_error',
      error: error.message,
      stack: error.stack,
      inputType: typeof raw,
      format
    });
    
    // Return a safe default in case of error
    return {
      content: String(raw || ''),
      format: 'text',
      metadata: { 
        normalized: false, 
        error: error.message,
        errorDetails: error.stack
      }
    };
  }
}

/**
 * Validates output against a schema if provided
 * @param {Object} output - Normalized output from normalizeLLMOutput
 * @param {Object} [schema] - Optional JSON schema to validate against
 * @returns {Object} - Validation result { valid: boolean, errors: Array, data: any }
 */
function validateOutput(output, schema) {
  if (!schema || output.format !== 'json') {
    return {
      valid: true,
      errors: [],
      data: output.content
    };
  }

  const result = validateSchema(output.content, schema);
  
  return {
    valid: result.valid,
    errors: normalizeSchemaErrors(result.errors),
    data: result.valid ? output.content : null
  };
}

module.exports = {
  normalizeLLMOutput,
  validateOutput
};
