/**
 * Audit Service
 * Handles logging of security-relevant events and actions
 */

const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');

// Ensure logs directory exists
const logDir = path.join(process.env.NODE_RED_HOME || '.', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create logger instance
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'audit' },
  transports: [
    // Write all logs with level `error` and below to `audit-error.log`
    // Write all logs with level `info` and below to `audit-combined.log`
    new transports.File({ 
      filename: path.join(logDir, 'audit-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new transports.File({ 
      filename: path.join(logDir, 'audit-combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest })`
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

/**
 * Logs an audit event
 * @param {Object} event - The event to log
 * @param {string} event.event - The event type/name
 * @param {string} event.user - The user who triggered the event
 * @param {Object} event.details - Additional event details
 */
function log(event) {
  const { event: eventType, user, details = {}, ...rest } = event;
  
  // Redact sensitive information
  const sanitizedDetails = { ...details };
  const sensitiveKeys = ['password', 'apiKey', 'token', 'secret', 'credentials'];
  
  Object.keys(sanitizedDetails).forEach(key => {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitizedDetails[key] = '***REDACTED***';
    }
  });
  
  logger.info({
    ...rest,
    event: eventType,
    user: user || 'system',
    details: sanitizedDetails
  });
}

/**
 * Logs an error event
 * @param {Error} error - The error to log
 * @param {Object} context - Additional context for the error
 */
function error(error, context = {}) {
  logger.error({
    ...context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  });
}

module.exports = {
  logger: {
    log,
    error
  },
  auditLogger: {
    log,
    error: (message, context) => error(new Error(message), context)
  }
};
