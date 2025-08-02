/**
 * Test script to reproduce the login network error
 * Tests connectivity to backend API and login functionality
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3008/api';

async function testBackendConnectivity() {
  console.log('🔍 Testing backend connectivity...');
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:3008/health', {
      timeout: 5000
    });
    
    console.log('✅ Backend health check successful:', healthResponse.data);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🚨 Backend server is not running on port 3008');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🚨 Connection timeout - backend may be slow or unresponsive');
    }
    
    return false;
  }
}

async function testLoginEndpoint() {
  console.log('🔍 Testing login endpoint...');
  
  try {
    // Test login endpoint with dummy credentials
    await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'test',
      password: 'test'
    }, {
      timeout: 5000
    });
    
    console.log('✅ Login endpoint is accessible (may fail with invalid credentials)');
    return true;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      console.log('✅ Login endpoint is accessible, server responded with:', error.response.status);
      console.log('Response:', error.response.data);
      return true;
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to login endpoint - backend not running');
      return false;
    } else {
      console.error('❌ Login endpoint test failed:', error.message);
      return false;
    }
  }
}

async function runTests() {
  console.log('🚀 Starting connectivity tests...\n');
  
  const healthCheck = await testBackendConnectivity();
  console.log('');
  
  if (healthCheck) {
    await testLoginEndpoint();
  } else {
    console.log('⏭️  Skipping login endpoint test - backend not accessible');
  }
  
  console.log('\n📋 Test Summary:');
  console.log(`Backend Health: ${healthCheck ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!healthCheck) {
    console.log('\n💡 Possible solutions:');
    console.log('1. Start the backend server: cd backend && npm start');
    console.log('2. Check if another process is using port 3008');
    console.log('3. Verify database connection is working');
  }
}

// Run the tests
runTests().catch(console.error);