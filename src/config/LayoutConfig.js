/**
 * Layout Configuration
 * Central configuration for layout parameters and height calculations
 */

class LayoutConfig {
  constructor() {
    this.config = {
      // Navigation configuration
      navigation: {
        height: 60, // Base navigation height in pixels
        padding: 24, // Total vertical padding (12px top + 12px bottom)
        zIndex: 1000,
        position: 'sticky'
      },
      
      // Content area configuration
      content: {
        padding: 20, // Default content padding (matches CustomerApp)
        gap: 10, // Default gap between sections
        additionalOffset: 32, // Additional offset to eliminate remaining scroll space (increased from 16px)
        minHeight: 'calc(100vh - var(--nav-height))', // Dynamic height calculation
        overflow: 'auto'
      },
      
      // Responsive breakpoints
      breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1400
      },
      
      // Animation and transition settings
      animations: {
        transitionDuration: '0.2s',
        easing: 'ease-in-out'
      },
      
      // Refresh intervals for height recalculation
      refreshIntervals: {
        heightRecalculation: 1000, // 1 second
        resizeDebounce: 250 // 250ms debounce for resize events
      }
    };
  }

  /**
   * Get configuration value by path
   * @param {string} path - Dot notation path to config value
   * @returns {*} Configuration value
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  /**
   * Set configuration value by path
   * @param {string} path - Dot notation path to config value
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
   * Calculate total navigation height including padding
   * @returns {number} Total navigation height in pixels
   */
  getNavigationTotalHeight() {
    return this.get('navigation.height') + this.get('navigation.padding');
  }

  /**
   * Get CSS custom properties for layout
   * @returns {Object} CSS custom properties object
   */
  getCSSCustomProperties() {
    const navHeight = this.getNavigationTotalHeight();
    const contentPadding = this.get('content.padding');
    const additionalOffset = this.get('content.additionalOffset');
    return {
      '--nav-height': `${navHeight}px`,
      '--content-height': `calc(100vh - ${navHeight}px - ${contentPadding * 2}px - ${additionalOffset}px)`,
      '--nav-z-index': this.get('navigation.zIndex'),
      '--content-padding': `${contentPadding}px`,
      '--content-gap': `${this.get('content.gap')}px`,
      '--transition-duration': this.get('animations.transitionDuration'),
      '--transition-easing': this.get('animations.easing')
    };
  }

  /**
   * Get responsive navigation height based on screen size
   * @param {number} screenWidth - Current screen width
   * @returns {number} Responsive navigation height
   */
  getResponsiveNavigationHeight(screenWidth) {
    const baseHeight = this.get('navigation.height');
    const mobile = this.get('breakpoints.mobile');
    const tablet = this.get('breakpoints.tablet');

    if (screenWidth < mobile) {
      return baseHeight + 10; // Slightly taller on mobile
    } else if (screenWidth < tablet) {
      return baseHeight + 5; // Slightly taller on tablet
    }
    return baseHeight; // Default height for desktop
  }

  /**
   * Update navigation height dynamically
   * @param {number} newHeight - New navigation height
   */
  updateNavigationHeight(newHeight) {
    this.set('navigation.height', newHeight);
    this.applyCSSCustomProperties();
  }

  /**
   * Apply CSS custom properties to document root
   */
  applyCSSCustomProperties() {
    const properties = this.getCSSCustomProperties();
    const root = document.documentElement;
    
    Object.entries(properties).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }

  /**
   * Initialize layout configuration
   * Sets up CSS custom properties and event listeners
   */
  initialize() {
    // Apply initial CSS custom properties
    this.applyCSSCustomProperties();

    // Set up resize listener for responsive height calculation
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const screenWidth = window.innerWidth;
        const newHeight = this.getResponsiveNavigationHeight(screenWidth);
        this.updateNavigationHeight(newHeight);
      }, this.get('refreshIntervals.resizeDebounce'));
    });

    // Set up periodic height recalculation
    setInterval(() => {
      this.recalculateHeights();
    }, this.get('refreshIntervals.heightRecalculation'));
  }

  /**
   * Recalculate heights based on actual DOM elements
   */
  recalculateHeights() {
    const navElement = document.querySelector('.app-navigation');
    if (navElement) {
      const actualHeight = navElement.offsetHeight;
      const currentConfigHeight = this.getNavigationTotalHeight();
      
      // Update if there's a significant difference (more than 5px)
      if (Math.abs(actualHeight - currentConfigHeight) > 5) {
        this.set('navigation.height', actualHeight - this.get('navigation.padding'));
        this.applyCSSCustomProperties();
      }
    }
  }

  /**
   * Get all configuration as object
   * @returns {Object} Complete configuration object
   */
  getAll() {
    return { ...this.config };
  }
}

// Create and export singleton instance
const layoutConfig = new LayoutConfig();

export default layoutConfig;