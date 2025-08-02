/**
 * Scroll Fix Test
 * Test to verify the 1rem bottom scroll area issue is resolved
 */

import LayoutManager from '../src/utils/LayoutManager.js';
import LayoutConfig from '../src/config/LayoutConfig.js';
import Logger from '../src/utils/Logger.js';

class ScrollFixTest {
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
   * Test updated content height calculation
   */
  async testContentHeightCalculation() {
    // Initialize LayoutManager
    LayoutManager.initialize();
    
    const cssProps = LayoutConfig.getCSSCustomProperties();
    const contentHeight = cssProps['--content-height'];
    
    // Check if content height includes padding subtraction
    if (!contentHeight.includes('- 40px')) { // 20px * 2 for top and bottom padding
      throw new Error(`Content height should subtract padding: ${contentHeight}`);
    }

    Logger.debug('Content height calculation:', {
      contentHeight,
      allProperties: cssProps
    });
  }

  /**
   * Test padding configuration consistency
   */
  async testPaddingConsistency() {
    const contentPadding = LayoutConfig.get('content.padding');
    
    if (contentPadding !== 20) {
      throw new Error(`Content padding should be 20px, got: ${contentPadding}px`);
    }

    const cssProps = LayoutConfig.getCSSCustomProperties();
    const cssPadding = cssProps['--content-padding'];
    
    if (cssPadding !== '20px') {
      throw new Error(`CSS content padding should be 20px, got: ${cssPadding}`);
    }

    Logger.debug('Padding consistency check:', {
      configPadding: contentPadding,
      cssPadding: cssPadding
    });
  }

  /**
   * Test mock element height calculation
   */
  async testMockElementHeight() {
    // Create mock elements to simulate the app structure
    const mockNav = document.createElement('nav');
    mockNav.className = 'app-navigation';
    mockNav.style.height = '84px'; // Typical navigation height
    document.body.appendChild(mockNav);

    const mockApp = document.createElement('div');
    mockApp.className = 'customer-app';
    mockApp.style.height = 'var(--content-height)';
    mockApp.style.padding = 'var(--content-padding)';
    document.body.appendChild(mockApp);

    try {
      // Apply layout
      LayoutManager.recalculateLayout();
      
      // Wait for CSS custom properties to be applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const root = document.documentElement;
      const contentHeight = root.style.getPropertyValue('--content-height');
      const contentPadding = root.style.getPropertyValue('--content-padding');
      
      if (!contentHeight) {
        throw new Error('--content-height CSS custom property not found');
      }
      
      if (contentPadding !== '20px') {
        throw new Error(`--content-padding should be 20px, got: ${contentPadding}`);
      }

      // Check if the calculation includes padding subtraction
      if (!contentHeight.includes('- 40px')) {
        throw new Error(`Content height should subtract 40px for padding: ${contentHeight}`);
      }

      Logger.debug('Mock element height test:', {
        contentHeight,
        contentPadding,
        windowHeight: window.innerHeight
      });
    } finally {
      // Clean up
      document.body.removeChild(mockNav);
      document.body.removeChild(mockApp);
    }
  }

  /**
   * Test scroll behavior simulation
   */
  async testScrollBehavior() {
    // Create a mock container with content
    const mockContainer = document.createElement('div');
    mockContainer.style.height = 'var(--content-height)';
    mockContainer.style.padding = 'var(--content-padding)';
    mockContainer.style.overflow = 'hidden';
    mockContainer.style.boxSizing = 'border-box';
    
    const mockContent = document.createElement('div');
    mockContent.style.height = '100%';
    mockContent.style.overflow = 'auto';
    mockContent.innerHTML = '<div style="height: 2000px;">Long content</div>';
    
    mockContainer.appendChild(mockContent);
    document.body.appendChild(mockContainer);

    try {
      // Apply layout
      LayoutManager.applyLayoutToComponent(mockContainer, {
        useContentHeight: true,
        additionalOffset: 0
      });

      // Wait for layout to be applied
      await new Promise(resolve => setTimeout(resolve, 100));

      const containerHeight = mockContainer.offsetHeight;
      const availableHeight = window.innerHeight - 84 - 40; // nav height - padding

      // Check if container height is approximately correct (within 5px tolerance)
      if (Math.abs(containerHeight - availableHeight) > 5) {
        throw new Error(`Container height ${containerHeight}px should be close to available height ${availableHeight}px`);
      }

      Logger.debug('Scroll behavior test:', {
        containerHeight,
        availableHeight,
        windowHeight: window.innerHeight
      });
    } finally {
      // Clean up
      document.body.removeChild(mockContainer);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    Logger.info('🧪 Starting Scroll Fix Tests...');
    
    await this.runTest('Content Height Calculation', () => this.testContentHeightCalculation());
    await this.runTest('Padding Consistency', () => this.testPaddingConsistency());
    await this.runTest('Mock Element Height', () => this.testMockElementHeight());
    await this.runTest('Scroll Behavior Simulation', () => this.testScrollBehavior());

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
    } else {
      Logger.info('\n🎉 All tests passed! The 1rem scroll issue should be resolved.');
    }

    return this.testResults;
  }

  /**
   * Save test results
   */
  saveResults() {
    const results = {
      timestamp: new Date().toISOString(),
      issue: 'Fix 1rem bottom scroll area',
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

    Logger.info('Scroll fix test results:', results);
    return results;
  }
}

// Export for use in other files
export default ScrollFixTest;

// If running directly in browser console or test environment
if (typeof window !== 'undefined') {
  window.ScrollFixTest = ScrollFixTest;
  
  // Auto-run tests if requested
  if (window.location.search.includes('run-scroll-tests')) {
    const test = new ScrollFixTest();
    test.runAllTests().then(() => {
      test.saveResults();
    });
  }
}