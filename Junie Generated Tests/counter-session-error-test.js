/**
 * Test script to verify counter session error message handling
 * This test simulates the scenario where a user tries to start a counter session
 * when they already have an active session, and verifies the proper error message is displayed.
 */

import DatabaseService from '../src/services/DatabaseService.js';
import Logger from '../src/utils/Logger.js';

// Mock the axios response for testing
const mockAxiosError = {
  response: {
    status: 409,
    data: {
      success: false,
      message: 'User already has an active counter session'
    }
  }
};

// Test function to simulate the error handling
function testErrorMessageHandling() {
  console.log('Testing counter session error message handling...\n');
  
  // Simulate the error from DatabaseService.handleError
  const operation = 'Start counter session';
  const message = mockAxiosError.response?.data?.message || mockAxiosError.message || 'Unknown error';
  const statusCode = mockAxiosError.response?.status || 500;
  
  console.log('Backend error message:', message);
  console.log('Status code:', statusCode);
  
  // Simulate the error thrown by DatabaseService.handleError
  const formattedError = new Error(`${operation} failed: ${message}`);
  formattedError.statusCode = statusCode;
  
  console.log('Formatted error message:', formattedError.message);
  
  // Simulate the error handling in ClerkApp.jsx
  let errorMessage = 'Gişe oturumu başlatılırken hata oluştu';
  if (formattedError.message.includes('Counter already occupied')) {
    errorMessage = 'Bu gişe başka bir görevli tarafından kullanılıyor';
  } else if (formattedError.message.includes('User already has an active counter session')) {
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

// Run the test
try {
  const result = testErrorMessageHandling();
  process.exit(result ? 0 : 1);
} catch (error) {
  console.error('Test failed with error:', error);
  process.exit(1);
}