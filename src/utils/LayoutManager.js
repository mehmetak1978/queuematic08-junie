/**
 * Layout Manager
 * Object-oriented solution for dynamic height calculation and layout management
 */

import LayoutConfig from '../config/LayoutConfig.js';
import Logger from './Logger.js';

class LayoutManager {
  constructor() {
    this.isInitialized = false;
    this.observers = new Map();
    this.resizeObserver = null;
    this.mutationObserver = null;
    this.eventListeners = new Map();
  }

  /**
   * Initialize the layout manager
   */
  initialize() {
    if (this.isInitialized) {
      Logger.warning('LayoutManager already initialized');
      return;
    }

    try {
      // Initialize layout configuration
      LayoutConfig.initialize();
      
      // Set up observers
      this.setupResizeObserver();
      this.setupMutationObserver();
      this.setupEventListeners();
      
      this.isInitialized = true;
      Logger.info('LayoutManager initialized successfully', {
        navHeight: LayoutConfig.getNavigationTotalHeight(),
        cssProperties: LayoutConfig.getCSSCustomProperties()
      });
    } catch (error) {
      Logger.error('Failed to initialize LayoutManager', error);
      throw error;
    }
  }

  /**
   * Set up ResizeObserver to monitor navigation element size changes
   */
  setupResizeObserver() {
    if (!window.ResizeObserver) {
      Logger.warning('ResizeObserver not supported, falling back to resize events');
      return;
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target.classList.contains('app-navigation')) {
          this.handleNavigationResize(entry);
        }
      }
    });

    // Observe navigation when it becomes available
    this.observeNavigationWhenReady();
  }

  /**
   * Set up MutationObserver to detect when navigation is added to DOM
   */
  setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const navElement = node.classList?.contains('app-navigation') 
              ? node 
              : node.querySelector?.('.app-navigation');
            
            if (navElement && this.resizeObserver) {
              this.resizeObserver.observe(navElement);
              Logger.debug('Started observing navigation element');
            }
          }
        });
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Set up event listeners for window resize and orientation change
   */
  setupEventListeners() {
    const handleResize = this.debounce(() => {
      this.recalculateLayout();
    }, LayoutConfig.get('refreshIntervals.resizeDebounce'));

    const handleOrientationChange = () => {
      // Delay recalculation to allow for orientation change to complete
      setTimeout(() => {
        this.recalculateLayout();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    this.eventListeners.set('resize', handleResize);
    this.eventListeners.set('orientationchange', handleOrientationChange);

    Logger.debug('Layout event listeners set up');
  }

  /**
   * Observe navigation element when it becomes ready
   */
  observeNavigationWhenReady() {
    const checkForNavigation = () => {
      const navElement = document.querySelector('.app-navigation');
      if (navElement && this.resizeObserver) {
        this.resizeObserver.observe(navElement);
        Logger.debug('Navigation element found and observed');
        return;
      }
      
      // Retry after a short delay
      setTimeout(checkForNavigation, 100);
    };

    checkForNavigation();
  }

  /**
   * Handle navigation resize events
   * @param {ResizeObserverEntry} entry - Resize observer entry
   */
  handleNavigationResize(entry) {
    const { height } = entry.contentRect;
    const currentHeight = LayoutConfig.getNavigationTotalHeight();
    
    // Update if height changed significantly (more than 2px)
    if (Math.abs(height - currentHeight) > 2) {
      LayoutConfig.updateNavigationHeight(height - LayoutConfig.get('navigation.padding'));
      Logger.debug('Navigation height updated', { 
        oldHeight: currentHeight, 
        newHeight: height 
      });
      
      // Notify observers
      this.notifyObservers('navigationResize', { height });
    }
  }

  /**
   * Recalculate entire layout
   */
  recalculateLayout() {
    try {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Update responsive navigation height
      const newNavHeight = LayoutConfig.getResponsiveNavigationHeight(screenWidth);
      LayoutConfig.updateNavigationHeight(newNavHeight);
      
      // Recalculate heights based on actual DOM
      LayoutConfig.recalculateHeights();
      
      Logger.debug('Layout recalculated', {
        screenWidth,
        screenHeight,
        navHeight: LayoutConfig.getNavigationTotalHeight()
      });
      
      // Notify observers
      this.notifyObservers('layoutRecalculated', {
        screenWidth,
        screenHeight,
        navHeight: LayoutConfig.getNavigationTotalHeight()
      });
    } catch (error) {
      Logger.error('Error recalculating layout', error);
    }
  }

  /**
   * Apply layout to a specific component
   * @param {HTMLElement} element - Element to apply layout to
   * @param {Object} options - Layout options
   */
  applyLayoutToComponent(element, options = {}) {
    if (!element) {
      Logger.warning('Cannot apply layout to null element');
      return;
    }

    const {
      useContentHeight = true,
      additionalOffset = 0,
      minHeight = null,
      maxHeight = null
    } = options;

    try {
      const navHeight = LayoutConfig.getNavigationTotalHeight();
      const availableHeight = window.innerHeight - navHeight - additionalOffset;
      
      if (useContentHeight) {
        element.style.height = `${availableHeight}px`;
        element.style.minHeight = minHeight || `${availableHeight}px`;
        if (maxHeight) {
          element.style.maxHeight = maxHeight;
        }
      }
      
      // Apply CSS custom properties
      const properties = LayoutConfig.getCSSCustomProperties();
      Object.entries(properties).forEach(([property, value]) => {
        element.style.setProperty(property, value);
      });
      
      Logger.debug('Layout applied to component', {
        elementClass: element.className,
        availableHeight,
        navHeight
      });
    } catch (error) {
      Logger.error('Error applying layout to component', error);
    }
  }

  /**
   * Register an observer for layout changes
   * @param {string} id - Observer ID
   * @param {Function} callback - Callback function
   */
  addObserver(id, callback) {
    this.observers.set(id, callback);
    Logger.debug(`Layout observer registered: ${id}`);
  }

  /**
   * Remove an observer
   * @param {string} id - Observer ID
   */
  removeObserver(id) {
    this.observers.delete(id);
    Logger.debug(`Layout observer removed: ${id}`);
  }

  /**
   * Notify all observers of layout changes
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  notifyObservers(event, data) {
    this.observers.forEach((callback, id) => {
      try {
        callback(event, data);
      } catch (error) {
        Logger.error(`Error in layout observer ${id}`, error);
      }
    });
  }

  /**
   * Get current layout information
   * @returns {Object} Layout information
   */
  getLayoutInfo() {
    return {
      navHeight: LayoutConfig.getNavigationTotalHeight(),
      contentHeight: window.innerHeight - LayoutConfig.getNavigationTotalHeight(),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      cssProperties: LayoutConfig.getCSSCustomProperties(),
      isInitialized: this.isInitialized
    };
  }

  /**
   * Debounce utility function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    try {
      // Disconnect observers
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      
      // Remove event listeners
      this.eventListeners.forEach((listener, event) => {
        window.removeEventListener(event, listener);
      });
      
      // Clear collections
      this.observers.clear();
      this.eventListeners.clear();
      
      this.isInitialized = false;
      Logger.info('LayoutManager destroyed');
    } catch (error) {
      Logger.error('Error destroying LayoutManager', error);
    }
  }
}

// Create and export singleton instance
const layoutManager = new LayoutManager();

export default layoutManager;