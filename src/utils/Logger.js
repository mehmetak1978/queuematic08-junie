/**
 * Central Logging Mechanism
 * Provides colored logging with configurable log levels
 */

import AppConfig from '../config/AppConfig.js';

class Logger {
  constructor() {
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARNING: 2,
      ERROR: 3
    };
    
    this.currentLevel = this.logLevels[AppConfig.get('logging.level')] || this.logLevels.INFO;
    this.colors = AppConfig.get('logging.colors');
  }

  /**
   * Format timestamp for log messages
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Create styled log message for browser console
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {string} color - Color for the log level
   * @returns {Array} Console arguments with styling
   */
  createStyledMessage(level, message, color) {
    const timestamp = this.getTimestamp();
    const levelStyle = `color: ${color}; font-weight: bold;`;
    const timestampStyle = 'color: #666; font-size: 0.9em;';
    
    return [
      `%c[${level}]%c %c${timestamp}%c ${message}`,
      levelStyle,
      '',
      timestampStyle,
      ''
    ];
  }

  /**
   * Check if message should be logged based on current log level
   * @param {string} level - Message log level
   * @returns {boolean} Whether to log the message
   */
  shouldLog(level) {
    return this.logLevels[level] >= this.currentLevel;
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {*} data - Optional data to log
   */
  debug(message, data = null) {
    if (!this.shouldLog('DEBUG')) return;
    
    const args = this.createStyledMessage('DEBUG', message, this.colors.DEBUG);
    console.log(...args);
    
    if (data) {
      console.log('Debug data:', data);
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {*} data - Optional data to log
   */
  info(message, data = null) {
    if (!this.shouldLog('INFO')) return;
    
    const args = this.createStyledMessage('INFO', message, this.colors.INFO);
    console.log(...args);
    
    if (data) {
      console.log('Info data:', data);
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {*} data - Optional data to log
   */
  warning(message, data = null) {
    if (!this.shouldLog('WARNING')) return;
    
    const args = this.createStyledMessage('WARNING', message, this.colors.WARNING);
    console.warn(...args);
    
    if (data) {
      console.warn('Warning data:', data);
    }
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Error|*} error - Error object or data to log
   */
  error(message, error = null) {
    if (!this.shouldLog('ERROR')) return;
    
    const args = this.createStyledMessage('ERROR', message, this.colors.ERROR);
    console.error(...args);
    
    if (error) {
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      } else {
        console.error('Error data:', error);
      }
    }
  }

  /**
   * Set log level dynamically
   * @param {string} level - New log level (DEBUG, INFO, WARNING, ERROR)
   */
  setLevel(level) {
    if (Object.prototype.hasOwnProperty.call(this.logLevels, level)) {
      this.currentLevel = this.logLevels[level];
      this.info(`Log level changed to: ${level}`);
    } else {
      this.warning(`Invalid log level: ${level}. Valid levels are: ${Object.keys(this.logLevels).join(', ')}`);
    }
  }

  /**
   * Get current log level
   * @returns {string} Current log level name
   */
  getLevel() {
    return Object.keys(this.logLevels).find(key => this.logLevels[key] === this.currentLevel);
  }

  /**
   * Log application startup information
   */
  logStartup() {
    const appName = AppConfig.get('app.name');
    const appVersion = AppConfig.get('app.version');
    
    this.info(`🚀 ${appName} v${appVersion} starting up...`);
    this.info(`📊 Log level set to: ${this.getLevel()}`);
    this.debug('Configuration loaded:', AppConfig.getAll());
  }
}

// Export singleton instance
export default new Logger();