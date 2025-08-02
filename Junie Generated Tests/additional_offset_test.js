/**
 * Additional Offset Test
 * Test to verify the additional offset eliminates remaining scroll space
 */

import LayoutManager from '../src/utils/LayoutManager.js';
import LayoutConfig from '../src/config/LayoutConfig.js';
import Logger from '../src/utils/Logger.js';

class AdditionalOffsetTest {
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
   * Test additional offset configuration
   */
  async testAdditionalOffsetConfig() {
    const additionalOffset = LayoutConfig.get('content.additionalOffset');
    
    if (additionalOffset !== 16) {
      throw new Error(`Additional offset should be 16px, got: ${additionalOffset}px`);
    }

    Logger.debug('Additional offset configuration:', {
      additionalOffset
    });
  }

  /**
   * Test updated height calculation with additional offset
   */
  async testUpdatedHeightCalculation() {
    // Initialize LayoutManager
    LayoutManager.initialize();
    
    const cssProps = LayoutConfig.getCSSCustomProperties();
    const contentHeight = cssProps['--content-height'];
    
    // Check if content height includes additional offset subtraction
    if (!contentHeight.includes('- 16px')) {
      throw new Error(`Content height should subtract additional offset: ${contentHeight}`);
    }

    // Verify the complete calculation
    const expectedPattern = /calc\(100vh - \d+px - \d+px - 16px\)/;
    if (!expectedPattern.test(contentHeight)) {
      throw new Error(`Content height calculation format incorrect: ${contentHeight}`);
    }

    Logger.debug('Updated height calculation:', {
      contentHeight,
      allProperties: cssProps
    });
  }

  /**
   * Test total space subtraction
   */
  async testTotalSpaceSubtraction() {
    const navHeight = LayoutConfig.getNavigationTotalHeight(); // 84px
    const contentPadding = LayoutConfig.get('content.padding') * 2; // 40px
    const additionalOffset = LayoutConfig.get('content.additionalOffset'); // 16px
    
    const totalSubtraction = navHeight + contentPadding + additionalOffset;
    const expectedTotal = 84 + 40 + 16; // 140px
    
    if (totalSubtraction !== expectedTotal) {
      throw new Error(`Total subtraction should be ${expectedTotal}px, got: ${totalSubtraction}px`);
    }

    Logger.debug('Total space subtraction:', {
      navHeight,
      contentPadding,
      additionalOffset,
      totalSubtraction
    });
  }

  /**
   * Test mock element with additional offset
   */
  async testMockElementWithOffset() {
    // Create mock navigation element
    const mockNav = document.createElement('nav');
    mockNav.className = 'app-navigation';
    mockNav.style.height = '84px';
    document.body.appendChild(mockNav);

    // Create mock app container
    const mockApp = document.createElement('div');
    mockApp.className = 'customer-app';
    mockApp.style.height = 'var(--content-height)';
    document.body.appendChild(mockApp);

    try {
      // Apply layout
      LayoutManager.recalculateLayout();
      
      // Wait for CSS custom properties to be applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const root = document.documentElement;
      const contentHeight = root.style.getPropertyValue('--content-height');
      
      // Verify the calculation includes all subtractions
      if (!contentHeight.includes('- 84px') || 
          !contentHeight.includes('- 40px') || 
          !contentHeight.includes('- 16px')) {
        throw new Error(`Content height should include all subtractions: ${contentHeight}`);
      }

      // Calculate expected available height
      const windowHeight = window.innerHeight;
      const expectedHeight = windowHeight - 84 - 40 - 16; // Total: 140px subtracted
      
      Logger.debug('Mock element test with offset:', {
        contentHeight,
        windowHeight,
        expectedHeight,
        totalSubtracted: 140
      });
    } finally {
      // Clean up
      document.body.removeChild(mockNav);
      document.body.removeChild(mockApp);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    Logger.info('🧪 Starting Additional Offset Tests...');
    
    await this.runTest('Additional Offset Configuration', () => this.testAdditionalOffsetConfig());
    await this.runTest('Updated Height Calculation', () => this.testUpdatedHeightCalculation());
    await this.runTest('Total Space Subtraction', () => this.testTotalSpaceSubtraction());
    await this.runTest('Mock Element with Offset', () => this.testMockElementWithOffset());

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
      Logger.info('\n🎉 All tests passed! Additional offset should eliminate remaining scroll space.');
    }

    return this.testResults;
  }

  /**
   * Save test results
   */
  saveResults() {
    const results = {
      timestamp: new Date().toISOString(),
      issue: 'Add additional offset to eliminate remaining scroll space',
      summary: {
        total: this.testResults.passed + this.testResults.failed,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: ((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1) + '%'
      },
      tests: this.testResults.tests,
      layoutInfo: LayoutManager.getLayoutInfo(),
      cssProperties: LayoutConfig.getCSSCustomProperties(),
      heightCalculation: {
        navHeight: LayoutConfig.getNavigationTotalHeight(),
        contentPadding: LayoutConfig.get('content.padding') * 2,
        additionalOffset: LayoutConfig.get('content.additionalOffset'),
        totalSubtracted: LayoutConfig.getNavigationTotalHeight() + (LayoutConfig.get('content.padding') * 2) + LayoutConfig.get('content.additionalOffset')
      }
    };

    Logger.info('Additional offset test results:', results);
    return results;
  }
}

// Export for use in other files
export default AdditionalOffsetTest;

// If running directly in browser console or test environment
if (typeof window !== 'undefined') {
  window.AdditionalOffsetTest = AdditionalOffsetTest;
  
  // Auto-run tests if requested
  if (window.location.search.includes('run-offset-tests')) {
    const test = new AdditionalOffsetTest();
    test.runAllTests().then(() => {
      test.saveResults();
    });
  }
}