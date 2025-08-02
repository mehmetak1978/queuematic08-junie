/**
 * Test Script: Scrolling Issue Reproduction
 * Tests the scrolling behavior when pages are resized/shrunk
 * Issue: "sayfaları küçülttüğümde hiçbir sayfada scroll gelmiyor"
 * (When I shrink the pages, no page has scroll)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
    testName: 'Scrolling Issue Reproduction Test',
    timestamp: new Date().toISOString(),
    cssFiles: [
        'src/components/display/DisplayApp.css',
        'src/components/customer/CustomerApp.css',
        'src/components/clerk/ClerkApp.css',
        'src/components/admin/AdminApp.css',
        'src/App.css',
        'src/index.css'
    ]
};

class ScrollingTestRunner {
    constructor() {
        this.results = {
            testName: TEST_CONFIG.testName,
            timestamp: TEST_CONFIG.timestamp,
            issues: [],
            recommendations: []
        };
    }

    /**
     * Check CSS files for overflow settings that prevent scrolling
     */
    async checkOverflowSettings() {
        console.log('🔍 Checking CSS files for overflow settings...');
        
        for (const cssFile of TEST_CONFIG.cssFiles) {
            const filePath = path.join(__dirname, '..', cssFile);
            
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const lines = content.split('\n');
                    
                    // Check for problematic overflow settings
                    lines.forEach((line, index) => {
                        const trimmedLine = line.trim().toLowerCase();
                        
                        // Check for overflow: hidden on body or html
                        if (trimmedLine.includes('overflow:') && trimmedLine.includes('hidden')) {
                            // Look for context (body, html, or container elements)
                            const contextLines = lines.slice(Math.max(0, index - 5), index + 1);
                            const context = contextLines.join('\n');
                            
                            if (context.toLowerCase().includes('body') || 
                                context.toLowerCase().includes('html') ||
                                context.toLowerCase().includes('root')) {
                                
                                this.results.issues.push({
                                    file: cssFile,
                                    line: index + 1,
                                    issue: 'overflow: hidden prevents scrolling',
                                    code: line.trim(),
                                    severity: 'HIGH',
                                    description: 'This setting prevents the page from scrolling when content overflows'
                                });
                            }
                        }
                        
                        // Check for height: 100% without overflow handling
                        if (trimmedLine.includes('height:') && 
                            (trimmedLine.includes('100%') || trimmedLine.includes('100vh'))) {
                            
                            // Check if there's no overflow handling in nearby lines
                            const nearbyLines = lines.slice(Math.max(0, index - 3), index + 4);
                            const hasOverflowHandling = nearbyLines.some(l => 
                                l.toLowerCase().includes('overflow:') && 
                                (l.toLowerCase().includes('auto') || l.toLowerCase().includes('scroll'))
                            );
                            
                            if (!hasOverflowHandling) {
                                this.results.issues.push({
                                    file: cssFile,
                                    line: index + 1,
                                    issue: 'Fixed height without overflow handling',
                                    code: line.trim(),
                                    severity: 'MEDIUM',
                                    description: 'Fixed height containers should have overflow handling for responsive design'
                                });
                            }
                        }
                    });
                    
                    console.log(`✅ Analyzed ${cssFile}`);
                } else {
                    console.log(`⚠️  File not found: ${cssFile}`);
                }
            } catch (error) {
                console.error(`❌ Error reading ${cssFile}:`, error.message);
            }
        }
    }

    /**
     * Generate recommendations based on found issues
     */
    generateRecommendations() {
        console.log('💡 Generating recommendations...');
        
        const hasBodyOverflowHidden = this.results.issues.some(issue => 
            issue.issue.includes('overflow: hidden') && 
            issue.severity === 'HIGH'
        );
        
        if (hasBodyOverflowHidden) {
            this.results.recommendations.push({
                priority: 'HIGH',
                action: 'Remove or modify overflow: hidden on body/html elements',
                description: 'Replace with overflow: auto or remove entirely to allow scrolling',
                files: this.results.issues
                    .filter(i => i.severity === 'HIGH')
                    .map(i => i.file)
            });
        }
        
        const hasFixedHeightIssues = this.results.issues.some(issue => 
            issue.issue.includes('Fixed height')
        );
        
        if (hasFixedHeightIssues) {
            this.results.recommendations.push({
                priority: 'MEDIUM',
                action: 'Add overflow handling to fixed height containers',
                description: 'Add overflow: auto to containers with fixed heights',
                files: this.results.issues
                    .filter(i => i.issue.includes('Fixed height'))
                    .map(i => i.file)
            });
        }
        
        // General responsive design recommendation
        this.results.recommendations.push({
            priority: 'LOW',
            action: 'Implement responsive design best practices',
            description: 'Use min-height instead of height, and ensure containers can grow with content',
            files: ['All CSS files']
        });
    }

    /**
     * Run the complete test suite
     */
    async runTests() {
        console.log(`🚀 Starting ${TEST_CONFIG.testName}...`);
        console.log(`📅 Timestamp: ${TEST_CONFIG.timestamp}`);
        console.log('');
        
        await this.checkOverflowSettings();
        this.generateRecommendations();
        
        // Display results
        console.log('\n📊 TEST RESULTS:');
        console.log('================');
        
        if (this.results.issues.length === 0) {
            console.log('✅ No scrolling issues found!');
        } else {
            console.log(`❌ Found ${this.results.issues.length} potential scrolling issues:`);
            console.log('');
            
            this.results.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.file} (Line ${issue.line})`);
                console.log(`   Severity: ${issue.severity}`);
                console.log(`   Issue: ${issue.issue}`);
                console.log(`   Code: ${issue.code}`);
                console.log(`   Description: ${issue.description}`);
                console.log('');
            });
        }
        
        if (this.results.recommendations.length > 0) {
            console.log('💡 RECOMMENDATIONS:');
            console.log('===================');
            
            this.results.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
                console.log(`   ${rec.description}`);
                console.log(`   Files: ${rec.files.join(', ')}`);
                console.log('');
            });
        }
        
        return this.results;
    }
}

// Run the test
const testRunner = new ScrollingTestRunner();
testRunner.runTests()
    .then(results => {
        console.log('🎯 Test completed successfully!');
        
        // Save results to file
        const resultsFile = path.join(__dirname, 'scrolling_test_results.json');
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`📄 Results saved to: ${resultsFile}`);
    })
    .catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });