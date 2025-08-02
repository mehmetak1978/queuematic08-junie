/**
 * Test script to reproduce the "counters.map is not a function" error
 * This simulates the scenario where DatabaseService.getAvailableCounters fails
 */

// Mock the scenario where getAvailableCounters returns undefined due to error
function simulateGetAvailableCountersError() {
  console.log('=== Reproducing counters.map error ===');
  
  // This simulates what happens when DatabaseService.getAvailableCounters fails
  // The method calls handleError which throws an error, but the catch block
  // in loadAvailableCounters doesn't handle the return value properly
  
  const counters = undefined; // This is what happens when the method fails
  
  try {
    // This line will fail with "counters.map is not a function"
    const result = counters.map(c => ({ id: c.id, name: c.name }));
    console.log('Result:', result);
  } catch (error) {
    console.error('ERROR:', error.message);
    console.log('This is the exact error we see in the browser console');
  }
}

// Test with different scenarios
function testDifferentScenarios() {
  console.log('\n=== Testing different return values ===');
  
  const testCases = [
    { name: 'undefined', value: undefined },
    { name: 'null', value: null },
    { name: 'empty string', value: '' },
    { name: 'number', value: 123 },
    { name: 'object', value: { error: 'API failed' } },
    { name: 'valid array', value: [{ id: 1, name: 'Counter 1' }] }
  ];
  
  testCases.forEach(testCase => {
    console.log(`\nTesting with ${testCase.name}:`, testCase.value);
    try {
      const result = testCase.value?.map ? testCase.value.map(c => c.name) : 'Cannot map';
      console.log('Result:', result);
    } catch (error) {
      console.error('ERROR:', error.message);
    }
  });
}

// Run the tests
simulateGetAvailableCountersError();
testDifferentScenarios();

console.log('\n=== Root Cause Analysis ===');
console.log('1. DatabaseService.getAvailableCounters() calls handleError() when API fails');
console.log('2. handleError() throws an error but method returns undefined');
console.log('3. ClerkApp.jsx tries to call counters.map() on undefined');
console.log('4. This causes "counters.map is not a function" error');
console.log('\n=== Solution ===');
console.log('1. Fix DatabaseService methods to return empty arrays on error');
console.log('2. Add proper error handling in ClerkApp.jsx');
console.log('3. Add data validation before calling .map()');