/**
 * Test for Database Column Fix
 * Verifies that the queue status endpoint works after fixing the "column c.name does not exist" error
 */

import http from 'http';

/**
 * Make HTTP request to test the queue status endpoint
 */
function testQueueStatusEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3008,
      path: '/api/queue/status/1',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: response
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Run the test
 */
async function runTest() {
  console.log('🧪 Testing Database Column Fix');
  console.log('==============================');
  
  try {
    console.log('📡 Testing queue status endpoint...');
    const result = await testQueueStatusEndpoint();
    
    console.log(`📊 Status Code: ${result.statusCode}`);
    
    if (result.statusCode === 200) {
      console.log('✅ SUCCESS: Endpoint returned 200 OK');
      
      if (result.data.success) {
        console.log('✅ SUCCESS: Response indicates success');
        console.log('📋 Response data structure:');
        console.log(`   - Branch ID: ${result.data.data.branchId}`);
        console.log(`   - Branch Name: ${result.data.data.branchName}`);
        console.log(`   - Waiting Count: ${result.data.data.waitingCount}`);
        console.log(`   - Active Counters: ${result.data.data.activeCounters}`);
        console.log(`   - Last Called: ${result.data.data.lastCalled || 'null'}`);
        
        console.log('\n🎉 DATABASE COLUMN FIX VERIFIED SUCCESSFULLY!');
        console.log('   The "column c.name does not exist" error has been resolved.');
        
      } else {
        console.log('❌ FAILURE: Response indicates failure');
        console.log('Response:', JSON.stringify(result.data, null, 2));
      }
    } else if (result.statusCode === 500) {
      console.log('❌ FAILURE: Still getting 500 Internal Server Error');
      console.log('Response:', JSON.stringify(result.data, null, 2));
    } else {
      console.log(`⚠️  UNEXPECTED: Got status code ${result.statusCode}`);
      console.log('Response:', JSON.stringify(result.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ TEST FAILED:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 3008');
    }
  }
}

// Run the test
runTest();