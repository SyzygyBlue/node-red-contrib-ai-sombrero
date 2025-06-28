/**
 * Task Processor
 * Handles the processing pipeline for LLM tasks
 */

const { auditLogger } = require('../../../services/audit-service');
const { normalizeLLMOutput, validateOutput } = require('./output-processor');
const { LLMError, ERROR_CODES, handleLLMError } = require('./error-handler');

/**
 * Processes a task through the LLM pipeline
 * @param {Object} task - The task to process
 * @param {Object} context - Processing context
 * @returns {Promise<Object>} - Processed task result
 */
async function processTask(task, context = {}) {
  const { node, config } = context;
  const startTime = Date.now();
  
  try {
    // 1. Validate input
    if (!task || typeof task !== 'object') {
      throw new LLMError('Invalid task: expected an object', ERROR_CODES.INVALID_INPUT);
    }

    // 2. Prepare processing context
    const processingContext = {
      nodeId: node?.id,
      configId: config?.id,
      timestamp: new Date().toISOString(),
      ...context
    };

    // 3. Process the task based on its type
    let result;
    switch (task.type) {
      case 'completion':
        result = await processCompletion(task, processingContext);
        break;
      case 'chat':
        result = await processChat(task, processingContext);
        break;
      case 'embedding':
        result = await processEmbedding(task, processingContext);
        break;
      default:
        throw new LLMError(
          `Unsupported task type: ${task.type}`,
          ERROR_CODES.INVALID_INPUT,
          { taskType: task.type }
        );
    }

    // 4. Calculate processing time
    const processingTime = Date.now() - startTime;

    // 5. Log successful processing
    auditLogger.info({
      event: 'task_processed',
      taskId: task.id,
      taskType: task.type,
      processingTime,
      ...processingContext
    });

    // 6. Return the result with metadata
    return {
      success: true,
      data: result,
      metadata: {
        taskId: task.id,
        processingTime,
        timestamp: processingContext.timestamp
      }
    };
  } catch (error) {
    // Handle the error and return a standardized error response
    return handleLLMError(error, {
      taskId: task?.id,
      taskType: task?.type,
      nodeId: node?.id,
      processingTime: Date.now() - startTime
    });
  }
}

/**
 * Processes a completion task
 * @private
 */
async function processCompletion(task, context) {
  // Implementation for completion tasks
  throw new Error('Not implemented: processCompletion');
}

/**
 * Processes a chat task
 * @private
 */
async function processChat(task, context) {
  // Implementation for chat tasks
  throw new Error('Not implemented: processChat');
}

/**
 * Processes an embedding task
 * @private
 */
async function processEmbedding(task, context) {
  // Implementation for embedding tasks
  throw new Error('Not implemented: processEmbedding');
}

/**
 * Validates a task against its schema
 * @param {Object} task - The task to validate
 * @param {Object} schema - The JSON Schema to validate against
 * @returns {Object} - Validation result
 */
function validateTask(task, schema) {
  // Delegate to output processor's validateOutput
  return validateOutput(
    { content: task, format: 'json' },
    schema
  );
}

module.exports = {
  processTask,
  validateTask,
  LLMError,
  ERROR_CODES
};
