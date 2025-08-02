/**
 * Application Configuration
 * Central configuration file for all system parameters
 */

class AppConfig {
  constructor() {
    this.config = {
      // Database Configuration
      database: {
        host: import.meta.env.VITE_DB_HOST || 'localhost',
        port: import.meta.env.VITE_DB_PORT || 5432,
        database: import.meta.env.VITE_DB_NAME || 'queuematic08',
        user: import.meta.env.VITE_DB_USER || 'qm_user',
        password: import.meta.env.VITE_DB_PASSWORD || 'password'
      },

      // Refresh Intervals (in milliseconds)
      refreshIntervals: {
        displayPanel: 3000,    // 3 seconds for display panel
        clerkApp: 5000,        // 5 seconds for clerk app
        customerApp: 10000,    // 10 seconds for customer app
        adminApp: 15000        // 15 seconds for admin app
      },

      // Logging Configuration
      logging: {
        level: import.meta.env.VITE_LOG_LEVEL || 'INFO',
        colors: {
          INFO: '#28a745',     // Green
          WARNING: '#ffc107',  // Yellow
          ERROR: '#dc3545',    // Red
          DEBUG: '#007bff'     // Blue
        }
      },

      // Application Settings
      app: {
        name: 'Queuematic System',
        version: '1.0.0',
        maxQueueNumber: 999,
        resetQueueDaily: true,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
      },

      // Counter Management Settings
      counter: {
        persistSessions: true,           // Enable counter session persistence
        autoRestoreOnLogin: true,        // Automatically restore active sessions on login
        autoSelectLastUsed: true,        // Automatically select last used counter when no active session
        sessionCheckInterval: 5000,     // Interval to check for session changes (ms)
        allowMultipleSessions: false,    // Allow user to have multiple active sessions
        rememberUserPreferences: true,  // Remember user's counter preferences across sessions
      },

      // UI Settings
      ui: {
        theme: 'modern',
        responsiveBreakpoints: {
          mobile: 768,
          tablet: 1024,
          desktop: 1200
        }
      },

      // Display Settings
      display: {
        arrow: {
          enabled: true,
          animated: true,
          color: '#ffffff',
          size: 'medium',
          animationSpeed: 2000, // milliseconds
          showPulseDot: true
        }
      }
    };
  }

  /**
   * Get configuration value by path
   * @param {string} path - Dot notation path (e.g., 'database.host')
   * @returns {*} Configuration value
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  /**
   * Set configuration value by path
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);
    target[lastKey] = value;
  }

  /**
   * Get all configuration
   * @returns {Object} Complete configuration object
   */
  getAll() {
    return { ...this.config };
  }
}

// Export singleton instance
export default new AppConfig();