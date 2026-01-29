/**
 * Simple Logger Utility
 * Provides consistent logging across the application
 */

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Get current timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message
   */
  formatMessage(level, message, ...args) {
    const timestamp = this.getTimestamp();
    const prefix = `[${timestamp}] [${level}]`;
    return { prefix, message, args };
  }

  /**
   * Log info message
   */
  info(message, ...args) {
    const { prefix, args: logArgs } = this.formatMessage('INFO', message);
    console.log(`${prefix} ${message}`, ...logArgs, ...args);
  }

  /**
   * Log error message
   */
  error(message, ...args) {
    const { prefix, args: logArgs } = this.formatMessage('ERROR', message);
    console.error(`${prefix} ${message}`, ...logArgs, ...args);
  }

  /**
   * Log warning message
   */
  warn(message, ...args) {
    const { prefix, args: logArgs } = this.formatMessage('WARN', message);
    console.warn(`${prefix} ${message}`, ...logArgs, ...args);
  }

  /**
   * Log debug message (only in development)
   */
  debug(message, ...args) {
    if (this.isDevelopment) {
      const { prefix, args: logArgs } = this.formatMessage('DEBUG', message);
      console.debug(`${prefix} ${message}`, ...logArgs, ...args);
    }
  }

  /**
   * Log success message
   */
  success(message, ...args) {
    const { prefix, args: logArgs } = this.formatMessage('SUCCESS', message);
    console.log(`✅ ${prefix} ${message}`, ...logArgs, ...args);
  }
}

const logger = new Logger();

export default logger;