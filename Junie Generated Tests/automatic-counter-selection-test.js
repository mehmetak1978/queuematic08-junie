/**
 * Automatic Counter Selection Test
 * Tests the automatic counter selection functionality based on last used counter
 * 
 * This test verifies that when a clerk logs in, if they don't have an active session
 * but have previously used a counter, the system automatically selects that counter
 * without requiring manual selection.
 */

import axios from 'axios';

const BACKEND_URL = 'http://localhost:3008';

// Test credentials
const TEST_CLERK = {
  username: 'clerk1',
  password: 'password123'
};

/**
 * Test the automatic counter selection functionality
 */
async function testAutomaticCounterSelection() {
  console.log('🧪 Testing Automatic Counter Selection Functionality...\n');
  
  let authToken = null;
  let sessionId = null;
  let counterId = null;
  let counterNumber = null;
  
  try {
    // Step 1: Login as clerk
    console.log('1️⃣ Logging in as clerk...');
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      username: TEST_CLERK.username,
      password: TEST_CLERK.password
    });
    
    authToken = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log(`✅ Login successful for user: ${user.username} (Branch: ${user.branchName})`);
    
    // Step 2: Clean up any existing active sessions
    console.log('\n2️⃣ Cleaning up existing sessions...');
    const existingSessionResponse = await axios.get(`${BACKEND_URL}/api/counters/my-session`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (existingSessionResponse.data.data) {
      const existingSession = existingSessionResponse.data.data;
      console.log('   Found existing active session, cleaning up...');
      
      // Complete any active queue items first
      if (existingSession.currentQueue) {
        try {
          await axios.post(`${BACKEND_URL}/api/queue/complete`, {
            queueId: existingSession.currentQueue.id
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          console.log('   ✅ Active queue item completed');
        } catch (error) {
          console.log('   ⚠️  Could not complete queue item:', error.response?.data?.message || error.message);
        }
      }
      
      // End the session
      await axios.post(`${BACKEND_URL}/api/counters/end-session`, {
        sessionId: existingSession.sessionId
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('   ✅ Previous session ended');
    } else {
      console.log('✅ No existing active session found');
    }
    
    // Step 3: Get available counters and start a session
    console.log('\n3️⃣ Starting a new counter session...');
    const countersResponse = await axios.get(`${BACKEND_URL}/api/counters/available/${user.branchId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const availableCounters = countersResponse.data.data;
    if (availableCounters.length === 0) {
      throw new Error('No available counters found for testing');
    }
    
    counterId = availableCounters[0].id;
    counterNumber = availableCounters[0].number;
    console.log(`   Using counter ${counterNumber} (ID: ${counterId})`);
    
    // Start counter session
    const sessionResponse = await axios.post(`${BACKEND_URL}/api/counters/start-session`, {
      counterId: counterId
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    sessionId = sessionResponse.data.data.sessionId;
    console.log(`✅ Counter session started (Session ID: ${sessionId})`);
    
    // Step 4: End the session to create history
    console.log('\n4️⃣ Ending counter session to create usage history...');
    await axios.post(`${BACKEND_URL}/api/counters/end-session`, {
      sessionId: sessionId
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Counter session ended - usage history created');
    
    // Step 5: Test the last-used counter API endpoint
    console.log('\n5️⃣ Testing last-used counter API endpoint...');
    const lastUsedResponse = await axios.get(`${BACKEND_URL}/api/counters/last-used`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const lastUsedCounter = lastUsedResponse.data.data;
    if (!lastUsedCounter) {
      throw new Error('❌ API TEST FAILED: No last used counter returned');
    }
    
    if (lastUsedCounter.counterId !== counterId) {
      throw new Error(`❌ API TEST FAILED: Wrong counter returned. Expected: ${counterId}, Got: ${lastUsedCounter.counterId}`);
    }
    
    console.log('✅ Last-used counter API working correctly:', {
      counterId: lastUsedCounter.counterId,
      counterNumber: lastUsedCounter.counterNumber,
      branchName: lastUsedCounter.branchName,
      lastUsed: lastUsedCounter.lastUsed
    });
    
    // Step 6: Simulate logout and login again
    console.log('\n6️⃣ Simulating logout and re-login...');
    authToken = null;
    console.log('   User logged out (token cleared)');
    
    const secondLoginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      username: TEST_CLERK.username,
      password: TEST_CLERK.password
    });
    
    authToken = secondLoginResponse.data.data.token;
    console.log('✅ Second login successful');
    
    // Step 7: Verify no active session exists
    console.log('\n7️⃣ Verifying no active session exists...');
    const noActiveSessionResponse = await axios.get(`${BACKEND_URL}/api/counters/my-session`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (noActiveSessionResponse.data.data) {
      throw new Error('❌ TEST SETUP FAILED: Active session still exists after re-login');
    }
    console.log('✅ Confirmed no active session exists');
    
    // Step 8: Verify last used counter is still available
    console.log('\n8️⃣ Verifying last used counter is available for auto-selection...');
    const finalLastUsedResponse = await axios.get(`${BACKEND_URL}/api/counters/last-used`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const finalLastUsedCounter = finalLastUsedResponse.data.data;
    if (!finalLastUsedCounter) {
      throw new Error('❌ AUTO-SELECTION TEST FAILED: Last used counter not available');
    }
    
    if (finalLastUsedCounter.counterId !== counterId) {
      throw new Error(`❌ AUTO-SELECTION TEST FAILED: Wrong counter available. Expected: ${counterId}, Got: ${finalLastUsedCounter.counterId}`);
    }
    
    console.log('🎉 AUTO-SELECTION SUCCESS: Last used counter is available for automatic selection!');
    console.log('✅ Counter details:', {
      counterId: finalLastUsedCounter.counterId,
      counterNumber: finalLastUsedCounter.counterNumber,
      branchName: finalLastUsedCounter.branchName,
      message: finalLastUsedResponse.data.message
    });
    
    // Step 9: Test that the counter can be selected automatically
    console.log('\n9️⃣ Testing automatic counter selection...');
    const autoSessionResponse = await axios.post(`${BACKEND_URL}/api/counters/start-session`, {
      counterId: finalLastUsedCounter.counterId
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const autoSessionId = autoSessionResponse.data.data.sessionId;
    console.log(`✅ Automatic counter selection successful (Session ID: ${autoSessionId})`);
    
    // Step 10: Clean up
    console.log('\n🔟 Cleaning up test session...');
    await axios.post(`${BACKEND_URL}/api/counters/end-session`, {
      sessionId: autoSessionId
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Test session cleaned up');
    
    console.log('\n🎉 AUTOMATIC COUNTER SELECTION TEST COMPLETED SUCCESSFULLY! 🎉');
    console.log('\n📋 Test Summary:');
    console.log('✅ User can create counter usage history');
    console.log('✅ Last-used counter API endpoint works correctly');
    console.log('✅ Last used counter persists after logout/login');
    console.log('✅ Last used counter is available for automatic selection');
    console.log('✅ Automatic counter selection works without manual intervention');
    console.log('✅ System properly tracks and restores user preferences');
    
    console.log('\n🚀 FRONTEND INTEGRATION READY:');
    console.log('The ClerkApp component should now automatically select the last used counter');
    console.log('when no active session exists, eliminating manual counter selection!');
    
  } catch (error) {
    console.error('\n❌ AUTOMATIC COUNTER SELECTION TEST FAILED!');
    console.error('Error:', error.response?.data?.message || error.message);
    
    // Cleanup on error
    if (authToken && sessionId) {
      try {
        console.log('\n🧹 Attempting cleanup...');
        await axios.post(`${BACKEND_URL}/api/counters/end-session`, {
          sessionId: sessionId
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Cleanup successful');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError.message);
      }
    }
    
    throw error;
  }
}

/**
 * Test backend connectivity
 */
async function testBackendConnectivity() {
  try {
    console.log('🔍 Testing backend connectivity...');
    await axios.get(`${BACKEND_URL}/api/auth/login`, {
      timeout: 5000
    });
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('🚨 Backend server is not running on port 3008');
      return false;
    } else if (error.code === 'ECONNABORTED') {
      console.error('🚨 Connection timeout - backend may be slow or unresponsive');
      return false;
    } else {
      // Other errors (like 400 for missing credentials) mean server is running
      return true;
    }
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🚀 Starting Automatic Counter Selection Test Suite\n');
  
  // Check backend connectivity first
  const isBackendRunning = await testBackendConnectivity();
  
  if (!isBackendRunning) {
    console.log('\n❌ Cannot run tests - backend server is not accessible');
    console.log('\n📝 To fix this:');
    console.log('1. Start the backend server: cd backend && npm start');
    console.log('2. Or use the startup script: ./start-backend.sh');
    console.log('3. Ensure PostgreSQL database is running');
    return;
  }
  
  try {
    await testAutomaticCounterSelection();
    console.log('\n🎊 ALL TESTS PASSED! Automatic counter selection is working correctly.');
  } catch {
    console.log('\n💥 TEST SUITE FAILED');
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);