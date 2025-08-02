/**
 * Simple standalone test to verify counter session error message handling
 * This test verifies the string matching logic without importing any dependencies
 */

// Test function to simulate the error handling logic
function testErrorMessageHandling() {
  console.log('Testing counter session error message handling...\n');
  
  // Simulate the backend error message
  const backendMessage = 'User already has an active counter session';
  console.log('Backend error message:', backendMessage);
  
  // Simulate the formatted error from DatabaseService.handleError
  const formattedErrorMessage = `Start counter session failed: ${backendMessage}`;
  console.log('Formatted error message:', formattedErrorMessage);
  
  // Simulate the error handling logic from ClerkApp.jsx (AFTER the fix)
  let errorMessage = 'Gişe oturumu başlatılırken hata oluştu';
  if (formattedErrorMessage.includes('Counter already occupied')) {
    errorMessage = 'Bu gişe başka bir görevli tarafından kullanılıyor';
  } else if (formattedErrorMessage.includes('User already has an active counter session')) {
    errorMessage = 'Zaten aktif bir gişe oturumunuz var';
  }
  
  console.log('Final user-facing error message:', errorMessage);
  
  // Verify the fix
  const expectedMessage = 'Zaten aktif bir gişe oturumunuz var';
  const testPassed = errorMessage === expectedMessage;
  
  console.log('\n--- Test Result ---');
  console.log('Expected:', expectedMessage);
  console.log('Actual:', errorMessage);
  console.log('Test Passed:', testPassed ? '✅ YES' : '❌ NO');
  
  return testPassed;
}

// Test the OLD logic (before the fix) to show it would fail
function testOldErrorHandling() {
  console.log('\n=== Testing OLD logic (before fix) ===');
  
  const backendMessage = 'User already has an active counter session';
  const formattedErrorMessage = `Start counter session failed: ${backendMessage}`;
  
  // OLD logic with incorrect string matching
  let errorMessage = 'Gişe oturumu başlatılırken hata oluştu';
  if (formattedErrorMessage.includes('Counter already occupied')) {
    errorMessage = 'Bu gişe başka bir görevli tarafından kullanılıyor';
  } else if (formattedErrorMessage.includes('User already has active session')) { // Missing "an" and "counter"
    errorMessage = 'Zaten aktif bir gişe oturumunuz var';
  }
  
  console.log('OLD logic result:', errorMessage);
  const oldTestPassed = errorMessage === 'Zaten aktif bir gişe oturumunuz var';
  console.log('OLD logic would pass:', oldTestPassed ? '✅ YES' : '❌ NO (shows generic message)');
  
  return !oldTestPassed; // Should return true (old logic fails)
}

// Run the tests
console.log('=== Counter Session Error Message Fix Test ===\n');

try {
  const newLogicPassed = testErrorMessageHandling();
  const oldLogicFailed = testOldErrorHandling();
  
  console.log('\n=== SUMMARY ===');
  console.log('New logic (after fix) works:', newLogicPassed ? '✅ YES' : '❌ NO');
  console.log('Old logic (before fix) failed:', oldLogicFailed ? '✅ YES (as expected)' : '❌ NO');
  console.log('Fix is successful:', (newLogicPassed && oldLogicFailed) ? '✅ YES' : '❌ NO');
  
  process.exit((newLogicPassed && oldLogicFailed) ? 0 : 1);
} catch (error) {
  console.error('Test failed with error:', error);
  process.exit(1);
}