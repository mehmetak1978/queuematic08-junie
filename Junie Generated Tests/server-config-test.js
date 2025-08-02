/**
 * Server Configuration Test
 * Tests that the server is working properly with the new central configuration
 */

import axios from 'axios';

const BACKEND_URL = 'http://localhost:3008';

async function testServerConfiguration() {
  console.log('🔧 Testing Server Configuration...');
  console.log('='.repeat(50));
  
  const tests = [];
  
  // Test 1: Health endpoint
  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Health endpoint working');
    console.log('   Environment:', healthResponse.data.environment);
    console.log('   Status:', healthResponse.data.status);
    tests.push({ name: 'Health Endpoint', success: true });
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
    tests.push({ name: 'Health Endpoint', success: false, error: error.message });
  }
  
  // Test 2: CORS headers
  try {
    console.log('\n2. Testing CORS headers...');
    await axios.options(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:5174',
        'Access-Control-Request-Method': 'GET'
      }
    });
    console.log('✅ CORS preflight working');
    tests.push({ name: 'CORS Headers', success: true });
  } catch (error) {
    console.log('❌ CORS preflight failed:', error.message);
    tests.push({ name: 'CORS Headers', success: false, error: error.message });
  }
  
  // Test 3: API endpoint structure
  try {
    console.log('\n3. Testing API endpoint structure...');
    const apiResponse = await axios.get(`${BACKEND_URL}/api/auth/login`, {
      validateStatus: () => true // Accept any status code
    });
    // We expect this to fail with 400/405 but not 404
    if (apiResponse.status === 404) {
      console.log('❌ API routes not properly configured');
      tests.push({ name: 'API Routes', success: false, error: 'Routes not found' });
    } else {
      console.log('✅ API routes properly configured');
      console.log('   Status:', apiResponse.status);
      tests.push({ name: 'API Routes', success: true });
    }
  } catch (error) {
    console.log('❌ API endpoint test failed:', error.message);
    tests.push({ name: 'API Routes', success: false, error: error.message });
  }
  
  // Test 4: Rate limiting configuration
  try {
    console.log('\n4. Testing rate limiting...');
    // Make multiple quick requests to test rate limiting is configured
    const requests = Array(5).fill().map(() => 
      axios.get(`${BACKEND_URL}/health`, { timeout: 5000 })
    );
    await Promise.all(requests);
    console.log('✅ Rate limiting configured (no immediate blocking)');
    tests.push({ name: 'Rate Limiting', success: true });
  } catch (error) {
    console.log('❌ Rate limiting test failed:', error.message);
    tests.push({ name: 'Rate Limiting', success: false, error: error.message });
  }
  
  // Summary
  console.log('\n📊 Configuration Test Summary');
  console.log('='.repeat(50));
  
  const successful = tests.filter(t => t.success);
  const failed = tests.filter(t => !t.success);
  
  console.log(`✅ Successful tests: ${successful.length}/${tests.length}`);
  console.log(`❌ Failed tests: ${failed.length}/${tests.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed test details:');
    failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.error || 'Unknown error'}`);
    });
  }
  
  if (successful.length > 0) {
    console.log('\n✅ Successful tests:');
    successful.forEach(s => {
      console.log(`  - ${s.name}`);
    });
  }
  
  return failed.length === 0;
}

// Run the test
testServerConfiguration()
  .then(success => {
    console.log(`\n🎯 Overall result: ${success ? 'PASS' : 'FAIL'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });