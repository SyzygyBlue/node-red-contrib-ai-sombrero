/**
 * Debug Utilities
 * Provides consistent debugging functionality across the LLM Connector
 */

const path = require('path');
const { auditLogger } = require('../../../../services/audit-service');
const { LLMError, ERROR_CODES } = require('../validation/error-types');

/**
 * Debug logger that conditionally logs based on debug flag
 * @param {Object} options - Debug options
 * @param {boolean} options.enabled - Whether debugging is enabled
 * @param {string} options.nodeId - ID of the node for context
 * @param {string} [options.prefix=''] - Optional prefix for log messages
 * @returns {Object} Debug logging functions
 */
function createDebugLogger({ enabled = false, nodeId = 'unknown', prefix = '' } = {}) {
  // Create a prefixed logger
  const prefixStr = prefix ? `[${prefix}] ` : '';
  
  // Track active timers
  const timers = new Map();
  
  // Base logger functions
  const logger = {
    /**
     * Log a debug message
     * @param {...any} args - Arguments to log
     */
    log(...args) {
      if (enabled) console.log(`${prefixStr}${nodeId}:`, ...args);
    },
    
    /**
     * Log an info message
     * @param {...any} args - Arguments to log
     */
    info(...args) {
      if (enabled) console.info(`${prefixStr}${nodeId}:`, ...args);
    },
    
    /**
     * Log a warning
     * @param {...any} args - Arguments to log
     */
    warn(...args) {
      if (enabled) console.warn(`${prefixStr}${nodeId}:`, ...args);
    },
    
    /**
     * Log an error
     * @param {...any} args - Arguments to log
     */
    error(...args) {
      // Always log errors, even if debug is disabled
      console.error(`${prefixStr}${nodeId}:`, ...args);
    },
    
    /**
     * Log a debug message (alias for log)
     * @param {...any} args - Arguments to log
     */
    debug(...args) {
      if (enabled) this.log(...args);
    },
    
    /**
     * Start a timer with the given label
     * @param {string} label - Timer label
     */
    time(label) {
      if (!enabled) return;
      const timerLabel = `${prefixStr}${label}`;
      console.time(timerLabel);
      timers.set(label, {
        start: process.hrtime(),
        label: timerLabel
      });
    },
    
    /**
     * End the timer with the given label and log the duration
     * @param {string} label - Timer label
     * @returns {number} Duration in milliseconds
     */
    timeEnd(label) {
      if (!enabled) return 0;
      const timer = timers.get(label);
      if (!timer) return 0;
      
      const [seconds, nanoseconds] = process.hrtime(timer.start);
      const durationMs = (seconds * 1000) + (nanoseconds / 1e6);
      
      console.timeEnd(timer.label);
      timers.delete(label);
      
      return durationMs;
    }
  };
  
  // Add logMessage function
  Object.defineProperty(logger, 'logMessage', {
    value: function(event, data = {}, level = 'debug') {
      const logEntry = {
        event,
        nodeId,
        timestamp: new Date().toISOString(),
        ...data
      };
      
      // Use the appropriate logging method based on level
      if (enabled || level === 'error') {
        switch (level.toLowerCase()) {
          case 'error':
            this.error(logEntry);
            break;
          case 'warn':
            this.warn(logEntry);
            break;
          case 'info':
            this.info(logEntry);
            break;
          case 'debug':
          default:
            this.debug(logEntry);
            break;
        }
      }
      
      // Also log to audit service if available
      try {
        if (typeof auditLogger === 'object' && auditLogger !== null) {
          if (typeof auditLogger[level] === 'function') {
            auditLogger[level](logEntry);
          } else if (typeof auditLogger.log === 'function') {
            auditLogger.log(logEntry);
          }
        }
      } catch (error) {
        console.error('Failed to log to audit service:', error);
      }
      
      return logEntry;
    },
    writable: true,
    configurable: true
  });
  
  // Add child function
  Object.defineProperty(logger, 'child', {
    value: function(childPrefix) {
      if (!childPrefix) return this;
      
      return createDebugLogger({
        enabled,
        nodeId,
        prefix: prefix ? `${prefix}:${childPrefix}` : childPrefix
      });
    },
    writable: true,
    configurable: true
  });
  
  return logger;
}

/**
 * Creates a debug context for a specific operation
 * @param {Object} options - Debug options
 * @param {boolean} options.enabled - Whether debugging is enabled
 * @param {string} options.nodeId - ID of the node for context
 * @param {string} [options.operation] - Operation name for context
 * @returns {Object} Debug context with logging and timing
 */
function createDebugContext(options) {
  const { enabled = false, nodeId = 'unknown', operation } = options;
  const debug = createDebugLogger({ enabled, nodeId, prefix: operation });
  
  /**
   * Debug context object exposing the underlying logger and helpers
   * Exposes logMessage directly for convenience so callers can use
   *   context.logMessage(...) instead of context.debug.logMessage(...)
   */
  const context = {
    debug,
    logMessage: debug.logMessage.bind(debug),
    
    /**
     * Wrap an async function with timing and automatic success/failure logging
     * @param {string} name - operation name
     * @param {Function} fn - async function to wrap
     * @returns {Function}
     */
    withTiming(name, fn) {
      if (!enabled) return fn;
      
      return async (...args) => {
        debug.time(name);
        try {
          const result = await fn(...args);
          const duration = debug.timeEnd(name);
          debug.logMessage(`${name}_completed`, { duration }, 'debug');
          return result;
        } catch (error) {
          debug.timeEnd(name);
          debug.logMessage(`${name}_failed`, { 
            error: error.message,
            stack: error.stack 
          }, 'error');
          throw error;
        }
      };
    },
    
    /**
     * Creates a child context with additional context
     * @param {string} childOperation - Additional operation context
     * @returns {Object} Child debug context
     */
    child(childOperation) {
      if (!childOperation) return this;
      
      return createDebugContext({
        enabled,
        nodeId,
        operation: operation ? `${operation}:${childOperation}` : childOperation
      });
    }
  };
  return context;
}

module.exports = {
  createDebugLogger,
  createDebugContext
};
