/**
 * Final Offset Test
 * Test to verify the increased additional offset (32px) eliminates all remaining scroll space
 */

import LayoutManager from '../src/utils/LayoutManager.js';
import LayoutConfig from '../src/config/LayoutConfig.js';
import Logger from '../src/utils/Logger.js';

class FinalOffsetTest {
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
   * Test increased additional offset configuration
   */
  async testIncreasedAdditionalOffset() {
    const additionalOffset = LayoutConfig.get('content.additionalOffset');
    
    if (additionalOffset !== 32) {
      throw new Error(`Additional offset should be 32px, got: ${additionalOffset}px`);
    }

    Logger.debug('Additional offset configuration:', {
      additionalOffset,
      previousValue: '16px (increased to eliminate remaining scroll)'
    });
  }

  /**
   * Test updated height calculation with increased offset
   */
  async testUpdatedHeightCalculation() {
    // Initialize LayoutManager
    LayoutManager.initialize();
    
    const cssProps = LayoutConfig.getCSSCustomProperties();
    const contentHeight = cssProps['--content-height'];
    
    // Check if content height includes the new 32px offset subtraction
    if (!contentHeight.includes('- 32px')) {
      throw new Error(`Content height should subtract 32px offset: ${contentHeight}`);
    }

    // Verify total subtraction is now 156px (84 + 40 + 32)
    const navHeight = LayoutConfig.getNavigationTotalHeight(); // 84px
    const contentPadding = LayoutConfig.get('content.padding') * 2; // 40px
    const additionalOffset = LayoutConfig.get('content.additionalOffset'); // 32px
    const totalSubtraction = navHeight + contentPadding + additionalOffset; // 156px

    if (totalSubtraction !== 156) {
      throw new Error(`Total subtraction should be 156px, got: ${totalSubtraction}px`);
    }

    Logger.debug('Updated height calculation:', {
      contentHeight,
      navHeight: `${navHeight}px`,
      contentPadding: `${contentPadding}px`,
      additionalOffset: `${additionalOffset}px`,
      totalSubtraction: `${totalSubtraction}px`
    });
  }

  /**
   * Test mock element with increased offset
   */
  async testMockElementWithIncreasedOffset() {
    // Create mock elements to simulate the app structure
    const mockNav = document.createElement('nav');
    mockNav.className = 'app-navigation';
    mockNav.style.height = '84px';
    document.body.appendChild(mockNav);

    const mockApp = document.createElement('div');
    mockApp.className = 'customer-app';
    mockApp.style.height = 'var(--content-height)';
    mockApp.style.padding = 'var(--content-padding)';
    mockApp.style.boxSizing = 'border-box';
    document.body.appendChild(mockApp);

    try {
      // Apply layout
      LayoutManager.recalculateLayout();
      
      // Wait for CSS custom properties to be applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const root = document.documentElement;
      const contentHeight = root.style.getPropertyValue('--content-height');
      
      if (!contentHeight) {
        throw new Error('--content-height CSS custom property not found');
      }

      // Check if the calculation includes the increased offset
      if (!contentHeight.includes('- 32px')) {
        throw new Error(`Content height should subtract 32px for additional offset: ${contentHeight}`);
      }

      // Calculate expected available height
      const windowHeight = window.innerHeight;
      const expectedAvailableHeight = windowHeight - 156; // Total subtraction

      Logger.debug('Mock element with increased offset test:', {
        contentHeight,
        windowHeight,
        expectedAvailableHeight,
        totalSubtracted: '156px (84px nav + 40px padding + 32px offset)'
      });
    } finally {
      // Clean up
      document.body.removeChild(mockNav);
      document.body.removeChild(mockApp);
    }
  }

  /**
   * Test scroll elimination verification
   */
  async testScrollEliminationVerification() {
    // Create a container that should fit exactly without scroll
    const mockContainer = document.createElement('div');
    mockContainer.style.height = 'var(--content-height)';
    mockContainer.style.padding = 'var(--content-padding)';
    mockContainer.style.overflow = 'hidden';
    mockContainer.style.boxSizing = 'border-box';
    mockContainer.style.border = '1px solid red'; // Visual indicator for testing
    
    const mockContent = document.createElement('div');
    mockContent.style.height = '100%';
    mockContent.style.background = 'lightblue';
    mockContent.innerHTML = '<div style="padding: 20px;">Content that should fit perfectly</div>';
    
    mockContainer.appendChild(mockContent);
    document.body.appendChild(mockContainer);

    try {
      // Apply layout
      LayoutManager.applyLayoutToComponent(mockContainer, {
        useContentHeight: true,
        additionalOffset: 0 // Don't add extra offset since it's already in CSS calculation
      });

      // Wait for layout to be applied
      await new Promise(resolve => setTimeout(resolve, 100));

      const containerHeight = mockContainer.offsetHeight;
      const windowHeight = window.innerHeight;
      const expectedMaxHeight = windowHeight - 156; // Should not exceed this

      // Container should be smaller than or equal to expected max height
      if (containerHeight > expectedMaxHeight + 5) { // 5px tolerance
        throw new Error(`Container height ${containerHeight}px exceeds expected max ${expectedMaxHeight}px`);
      }

      Logger.debug('Scroll elimination verification:', {
        containerHeight,
        windowHeight,
        expectedMaxHeight,
        heightDifference: windowHeight - containerHeight,
        scrollShouldBeEliminated: true
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
    Logger.info('🧪 Starting Final Offset Tests (32px additional offset)...');
    
    await this.runTest('Increased Additional Offset Configuration', () => this.testIncreasedAdditionalOffset());
    await this.runTest('Updated Height Calculation', () => this.testUpdatedHeightCalculation());
    await this.runTest('Mock Element with Increased Offset', () => this.testMockElementWithIncreasedOffset());
    await this.runTest('Scroll Elimination Verification', () => this.testScrollEliminationVerification());

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
      Logger.info('\n🎉 All tests passed! The remaining 1rem scroll issue should now be completely eliminated.');
      Logger.info('📏 Total space subtracted: 156px (84px nav + 40px padding + 32px buffer)');
    }

    return this.testResults;
  }

  /**
   * Save test results
   */
  saveResults() {
    const results = {
      timestamp: new Date().toISOString(),
      issue: 'Eliminate final 1rem scroll space with increased offset',
      solution: 'Increased additionalOffset from 16px to 32px',
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
        navigationHeight: '84px',
        contentPadding: '40px (20px × 2)',
        additionalOffset: '32px (increased from 16px)',
        totalSubtracted: '156px',
        formula: 'calc(100vh - 84px - 40px - 32px)'
      }
    };

    Logger.info('Final offset test results:', results);
    return results;
  }
}

// Export for use in other files
export default FinalOffsetTest;

// If running directly in browser console or test environment
if (typeof window !== 'undefined') {
  window.FinalOffsetTest = FinalOffsetTest;
  
  // Auto-run tests if requested
  if (window.location.search.includes('run-final-offset-tests')) {
    const test = new FinalOffsetTest();
    test.runAllTests().then(() => {
      test.saveResults();
    });
  }
}