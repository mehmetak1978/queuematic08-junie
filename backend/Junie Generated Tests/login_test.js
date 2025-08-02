/**
 * Login Test Script
 * Tests the authentication endpoint to reproduce the login issue
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3008/api';

/**
 * Test login functionality
 * @param {string} username - Username to test
 * @param {string} password - Password to test
 */
async function testLogin(username, password) {
  console.log(`\n🔐 Testing login for: ${username}`);
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username,
      password
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.log('❌ Login failed!');
    console.log('Error status:', error.response?.status || 'No status');
    console.log('Error message:', error.response?.data?.message || error.message);
    console.log('Full error response:', JSON.stringify(error.response?.data, null, 2));
    
    return { success: false, error: error.response?.data || error.message };
  }
}

/**
 * Test server health
 */
async function testServerHealth() {
  console.log('🏥 Testing server health...');
  
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Server is healthy');
    console.log('Health data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Server health check failed');
    console.log('Error:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Login Tests');
  console.log('='.repeat(60));
  
  // Test server health first
  const serverHealthy = await testServerHealth();
  if (!serverHealthy) {
    console.log('❌ Server is not healthy, aborting tests');
    return;
  }
  
  // Test credentials that were reported as failing
  const testCredentials = [
    { username: 'admin', password: 'password123' },
    { username: 'clerk1', password: 'password123' },
    { username: 'clerk2', password: 'password123' }
  ];
  
  const results = [];
  
  for (const creds of testCredentials) {
    const result = await testLogin(creds.username, creds.password);
    results.push({
      username: creds.username,
      ...result
    });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful logins: ${successful.length}`);
  console.log(`❌ Failed logins: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed login details:');
    failed.forEach(f => {
      console.log(`  - ${f.username}: ${f.error?.message || 'Unknown error'}`);
    });
  }
  
  if (successful.length > 0) {
    console.log('\n✅ Successful login details:');
    successful.forEach(s => {
      console.log(`  - ${s.username}: ${s.data?.data?.user?.role || 'Unknown role'}`);
    });
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { testLogin, testServerHealth, runTests };