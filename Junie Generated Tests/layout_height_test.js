/**
 * Layout Height Test
 * Test to verify LayoutManager initialization and height calculation fixes
 */

import LayoutManager from '../src/utils/LayoutManager.js';
import LayoutConfig from '../src/config/LayoutConfig.js';
import Logger from '../src/utils/Logger.js';

class LayoutHeightTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Run a single test
   * @param {string} testName - Name of the test
   * @param {Function} testFunction - Test function to execute
   */
  async runTest(testName, testFunction) {
    try {
      Logger.info(`Running test: ${testName}`);
      await testFunction();
      this.testResults.passed++;
      this.testResults.tests.push({
        name: testName,
        status: 'PASSED',
        message: 'Test completed successfully'
      });
      Logger.info(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.tests.push({
        name: testName,
        status: 'FAILED',
        message: error.message,
        error: error.stack
      });
      Logger.error(`❌ ${testName} - FAILED`, error);
    }
  }

  /**
   * Test LayoutManager initialization
   */
  async testLayoutManagerInitialization() {
    // Initialize LayoutManager
    LayoutManager.initialize();
    
    // Check if initialized
    if (!LayoutManager.isInitialized) {
      throw new Error('LayoutManager failed to initialize');
    }

    // Check if CSS custom properties are applied
    const root = document.documentElement;
    const navHeight = root.style.getPropertyValue('--nav-height');
    const contentHeight = root.style.getPropertyValue('--content-height');
    
    if (!navHeight) {
      throw new Error('--nav-height CSS custom property not found');
    }
    
    if (!contentHeight) {
      throw new Error('--content-height CSS custom property not found');
    }

    Logger.debug('CSS Custom Properties:', {
      navHeight,
      contentHeight,
      allProperties: LayoutConfig.getCSSCustomProperties()
    });
  }

  /**
   * Test navigation height calculation
   */
  async testNavigationHeightCalculation() {
    const totalHeight = LayoutConfig.getNavigationTotalHeight();
    const baseHeight = LayoutConfig.get('navigation.height');
    const padding = LayoutConfig.get('navigation.padding');
    
    if (totalHeight !== baseHeight + padding) {
      throw new Error(`Navigation height calculation incorrect: ${totalHeight} !== ${baseHeight + padding}`);
    }

    Logger.debug('Navigation height calculation:', {
      baseHeight,
      padding,
      totalHeight
    });
  }

  /**
   * Test responsive navigation height
   */
  async testResponsiveNavigationHeight() {
    const mobileHeight = LayoutConfig.getResponsiveNavigationHeight(600);
    const tabletHeight = LayoutConfig.getResponsiveNavigationHeight(900);
    const desktopHeight = LayoutConfig.getResponsiveNavigationHeight(1200);
    
    if (mobileHeight <= tabletHeight && tabletHeight <= desktopHeight) {
      throw new Error('Responsive heights should decrease as screen size increases');
    }

    Logger.debug('Responsive navigation heights:', {
      mobile: mobileHeight,
      tablet: tabletHeight,
      desktop: desktopHeight
    });
  }

  /**
   * Test layout application to mock element
   */
  async testLayoutApplication() {
    // Create a mock element
    const mockElement = document.createElement('div');
    mockElement.className = 'test-element';
    document.body.appendChild(mockElement);

    try {
      // Apply layout
      LayoutManager.applyLayoutToComponent(mockElement, {
        useContentHeight: true,
        additionalOffset: 10
      });

      // Check if height was applied
      const appliedHeight = mockElement.style.height;
      if (!appliedHeight) {
        throw new Error('Height was not applied to mock element');
      }

      // Check if CSS custom properties were applied
      const navHeightProp = mockElement.style.getPropertyValue('--nav-height');
      if (!navHeightProp) {
        throw new Error('CSS custom properties were not applied to mock element');
      }

      Logger.debug('Layout applied to mock element:', {
        height: appliedHeight,
        navHeight: navHeightProp
      });
    } finally {
      // Clean up
      document.body.removeChild(mockElement);
    }
  }

  /**
   * Test observer functionality
   */
  async testObserverFunctionality() {
    let observerCalled = false;
    let observerData = null;

    // Add observer
    LayoutManager.addObserver('test-observer', (event, data) => {
      observerCalled = true;
      observerData = { event, data };
    });

    // Trigger layout recalculation
    LayoutManager.recalculateLayout();

    // Wait a bit for observer to be called
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!observerCalled) {
      throw new Error('Observer was not called during layout recalculation');
    }

    // Clean up
    LayoutManager.removeObserver('test-observer');

    Logger.debug('Observer test completed:', observerData);
  }

  /**
   * Test different screen sizes
   */
  async testDifferentScreenSizes() {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    try {
      // Test mobile size
      Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
      LayoutManager.recalculateLayout();
      
      const mobileLayout = LayoutManager.getLayoutInfo();
      
      // Test desktop size
      Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 900, writable: true });
      LayoutManager.recalculateLayout();
      
      const desktopLayout = LayoutManager.getLayoutInfo();

      Logger.debug('Screen size test results:', {
        mobile: mobileLayout,
        desktop: desktopLayout
      });

      if (mobileLayout.contentHeight === desktopLayout.contentHeight) {
        throw new Error('Content height should differ between mobile and desktop');
      }
    } finally {
      // Restore original dimensions
      Object.defineProperty(window, 'innerWidth', { value: originalWidth, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: originalHeight, writable: true });
      LayoutManager.recalculateLayout();
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    Logger.info('🧪 Starting Layout Height Tests...');
    
    await this.runTest('LayoutManager Initialization', () => this.testLayoutManagerInitialization());
    await this.runTest('Navigation Height Calculation', () => this.testNavigationHeightCalculation());
    await this.runTest('Responsive Navigation Height', () => this.testResponsiveNavigationHeight());
    await this.runTest('Layout Application', () => this.testLayoutApplication());
    await this.runTest('Observer Functionality', () => this.testObserverFunctionality());
    await this.runTest('Different Screen Sizes', () => this.testDifferentScreenSizes());

    // Print summary
    const total = this.testResults.passed + this.testResults.failed;
    Logger.info(`\n📊 Test Summary:`);
    Logger.info(`Total Tests: ${total}`);
    Logger.info(`Passed: ${this.testResults.passed}`);
    Logger.info(`Failed: ${this.testResults.failed}`);
    Logger.info(`Success Rate: ${((this.testResults.passed / total) * 100).toFixed(1)}%`);

    if (this.testResults.failed > 0) {
      Logger.error('\n❌ Failed Tests:');
      this.testResults.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          Logger.error(`- ${test.name}: ${test.message}`);
        });
    }

    return this.testResults;
  }

  /**
   * Save test results to file
   */
  saveResults() {
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.passed + this.testResults.failed,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: ((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1) + '%'
      },
      tests: this.testResults.tests,
      layoutInfo: LayoutManager.getLayoutInfo(),
      cssProperties: LayoutConfig.getCSSCustomProperties()
    };

    // In a real environment, you would save this to a file
    // For now, we'll just log it
    Logger.info('Test results saved:', results);
    return results;
  }
}

// Export for use in other files
export default LayoutHeightTest;

// If running directly in browser console or test environment
if (typeof window !== 'undefined') {
  window.LayoutHeightTest = LayoutHeightTest;
  
  // Auto-run tests if requested
  if (window.location.search.includes('run-layout-tests')) {
    const test = new LayoutHeightTest();
    test.runAllTests().then(() => {
      test.saveResults();
    });
  }
}