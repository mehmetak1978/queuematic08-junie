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
        password: import.meta.env.VITE_DB_PASSWORD || 'PSWD'
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
        },
        // Green-weighted color theme
        colors: {
          // Primary green palette
          primary: {
            50: '#f0fdf4',   // Very light green
            100: '#dcfce7',  // Light green
            200: '#bbf7d0',  // Lighter green
            300: '#86efac',  // Light green
            400: '#4ade80',  // Medium light green
            500: '#22c55e',  // Base green
            600: '#16a34a',  // Medium green
            700: '#15803d',  // Dark green
            800: '#166534',  // Darker green
            900: '#14532d'   // Very dark green
          },
          // Secondary green palette (more muted)
          secondary: {
            50: '#f8fffe',   // Very light mint
            100: '#e8f5e8',  // Light mint
            200: '#c8e6c9',  // Lighter mint
            300: '#a5d6a7',  // Light mint green
            400: '#81c784',  // Medium mint green
            500: '#66bb6a',  // Base mint green
            600: '#4caf50',  // Medium mint green
            700: '#388e3c',  // Dark mint green
            800: '#2e7d32',  // Darker mint green
            900: '#1b5e20'   // Very dark mint green
          },
          // Accent colors
          accent: {
            success: '#22c55e',  // Green success
            warning: '#ffc107',  // Yellow warning
            error: '#dc3545',    // Red error
            info: '#28a745'      // Green info
          },
          // Neutral colors
          neutral: {
            50: '#f8f9fa',   // Very light gray
            100: '#f1f3f4',  // Light gray
            200: '#e9ecef',  // Lighter gray
            300: '#dee2e6',  // Light gray
            400: '#ced4da',  // Medium light gray
            500: '#adb5bd',  // Medium gray
            600: '#6c757d',  // Medium dark gray
            700: '#495057',  // Dark gray
            800: '#343a40',  // Darker gray
            900: '#212529'   // Very dark gray
          },
          // Text colors
          text: {
            primary: '#2d3748',     // Dark gray for primary text
            secondary: '#718096',   // Medium gray for secondary text
            muted: '#a0aec0',      // Light gray for muted text
            inverse: '#ffffff'      // White for dark backgrounds
          },
          // Background colors
          background: {
            primary: '#ffffff',     // White background
            secondary: '#f8f9fa',   // Light gray background
            muted: '#e9ecef',      // Muted background
            dark: '#1a365d',       // Dark background
            gradient: {
              light: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              medium: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              dark: 'linear-gradient(135deg, #1a365d 0%, #2d3748 100%)'
            }
          },
          // Component specific colors
          components: {
            button: {
              primary: '#22c55e',
              primaryHover: '#16a34a',
              secondary: '#f8f9fa',
              secondaryHover: '#e9ecef'
            },
            card: {
              background: '#ffffff',
              border: 'rgba(34, 197, 94, 0.1)',
              shadow: '0 4px 20px rgba(34, 197, 94, 0.1)'
            },
            navigation: {
              background: '#ffffff',
              text: '#2d3748',
              active: '#22c55e',
              hover: 'rgba(34, 197, 94, 0.1)'
            }
          }
        }
      },

      // Display Settings
      display: {
        arrow: {
          enabled: true,
          animated: true,
          color: '#4ade80',
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