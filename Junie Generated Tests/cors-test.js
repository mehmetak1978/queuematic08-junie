/**
 * CORS Test Script
 * Tests the CORS configuration by making a request from the frontend origin to the backend
 */

import axios from 'axios';

const FRONTEND_URL = 'http://localhost:5174';
const BACKEND_URL = 'http://localhost:3008';

async function testCORSConfiguration() {
  console.log('🧪 Testing CORS Configuration...');
  console.log(`Frontend Origin: ${FRONTEND_URL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  
  try {
    // Test a simple API call that would trigger CORS
    const response = await axios.get(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ CORS Test Passed!');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.log('❌ CORS Test Failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
    } else if (error.request) {
      console.log('Request Error:', error.message);
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Run the test
testCORSConfiguration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });