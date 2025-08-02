/**
 * Counter Persistence Test
 * Tests the counter persistence functionality for clerk users
 * 
 * This test verifies that when a clerk logs in again, if they have an active
 * counter session in the database, they should continue using it without
 * having to select a counter again.
 */

import axios from 'axios';

const BACKEND_URL = 'http://localhost:3008';

// Test credentials
const TEST_CLERK = {
  username: 'clerk1',
  password: 'password123'
};

/**
 * Test the counter persistence functionality
 */
async function testCounterPersistence() {
  console.log('🧪 Testing Counter Persistence Functionality...\n');
  
  let authToken = null;
  let sessionId = null;
  let counterId = null;
  
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
    
    // Step 2: Check if user has active session (should be none initially)
    console.log('\n2️⃣ Checking for existing active session...');
    const initialSessionResponse = await axios.get(`${BACKEND_URL}/api/counters/my-session`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (initialSessionResponse.data.data) {
      console.log('⚠️  User already has an active session. Cleaning up first...');
      const existingSession = initialSessionResponse.data.data;
      
      // If there's an active queue item, complete it first
      if (existingSession.currentQueue) {
        console.log('   Completing active queue item...');
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
      
      // Now end the session
      await axios.post(`${BACKEND_URL}/api/counters/end-session`, {
        sessionId: existingSession.sessionId
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Previous session ended');
    } else {
      console.log('✅ No existing active session found');
    }
    
    // Step 3: Get available counters
    console.log('\n3️⃣ Getting available counters...');
    const countersResponse = await axios.get(`${BACKEND_URL}/api/counters/available/${user.branchId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const availableCounters = countersResponse.data.data;
    if (availableCounters.length === 0) {
      throw new Error('No available counters found for testing');
    }
    
    counterId = availableCounters[0].id;
    console.log(`✅ Found ${availableCounters.length} available counters. Using counter ${availableCounters[0].number}`);
    
    // Step 4: Start a counter session
    console.log('\n4️⃣ Starting counter session...');
    const sessionResponse = await axios.post(`${BACKEND_URL}/api/counters/start-session`, {
      counterId: counterId
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    sessionId = sessionResponse.data.data.sessionId;
    console.log(`✅ Counter session started successfully (Session ID: ${sessionId})`);
    
    // Step 5: Verify active session exists
    console.log('\n5️⃣ Verifying active session...');
    const activeSessionResponse = await axios.get(`${BACKEND_URL}/api/counters/my-session`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const activeSession = activeSessionResponse.data.data;
    if (!activeSession) {
      throw new Error('Active session not found after starting session');
    }
    
    console.log('✅ Active session verified:', {
      sessionId: activeSession.sessionId,
      counterId: activeSession.counterId,
      counterNumber: activeSession.counterNumber,
      branchName: activeSession.branchName
    });
    
    // Step 6: Simulate logout (just clear token locally)
    console.log('\n6️⃣ Simulating logout...');
    authToken = null;
    console.log('✅ User logged out (token cleared)');
    
    // Step 7: Login again
    console.log('\n7️⃣ Logging in again...');
    const secondLoginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      username: TEST_CLERK.username,
      password: TEST_CLERK.password
    });
    
    authToken = secondLoginResponse.data.data.token;
    console.log('✅ Second login successful');
    
    // Step 8: Check for active session (should exist from before)
    console.log('\n8️⃣ Checking for active session after re-login...');
    const persistedSessionResponse = await axios.get(`${BACKEND_URL}/api/counters/my-session`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const persistedSession = persistedSessionResponse.data.data;
    if (!persistedSession) {
      throw new Error('❌ PERSISTENCE FAILED: No active session found after re-login');
    }
    
    if (persistedSession.sessionId !== sessionId) {
      throw new Error(`❌ PERSISTENCE FAILED: Session ID mismatch. Expected: ${sessionId}, Got: ${persistedSession.sessionId}`);
    }
    
    console.log('🎉 PERSISTENCE SUCCESS: Active session restored after re-login!');
    console.log('✅ Session details:', {
      sessionId: persistedSession.sessionId,
      counterId: persistedSession.counterId,
      counterNumber: persistedSession.counterNumber,
      branchName: persistedSession.branchName
    });
    
    // Step 9: Clean up - end the session
    console.log('\n9️⃣ Cleaning up - ending session...');
    await axios.post(`${BACKEND_URL}/api/counters/end-session`, {
      sessionId: persistedSession.sessionId
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Session ended successfully');
    
    // Step 10: Verify session is ended
    console.log('\n🔟 Verifying session cleanup...');
    const finalSessionResponse = await axios.get(`${BACKEND_URL}/api/counters/my-session`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (finalSessionResponse.data.data) {
      console.log('⚠️  Session still exists after cleanup');
    } else {
      console.log('✅ Session successfully cleaned up');
    }
    
    console.log('\n🎉 COUNTER PERSISTENCE TEST COMPLETED SUCCESSFULLY! 🎉');
    console.log('\n📋 Test Summary:');
    console.log('✅ User can start a counter session');
    console.log('✅ Session persists in database');
    console.log('✅ Session is restored after re-login');
    console.log('✅ User doesn\'t need to select counter again');
    console.log('✅ Session can be properly ended');
    
  } catch (error) {
    console.error('\n❌ COUNTER PERSISTENCE TEST FAILED!');
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
    const healthResponse = await axios.get(`${BACKEND_URL}/api/auth/login`, {
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
  console.log('🚀 Starting Counter Persistence Test Suite\n');
  
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
    await testCounterPersistence();
    console.log('\n🎊 ALL TESTS PASSED! Counter persistence is working correctly.');
  } catch (error) {
    console.log('\n💥 TEST SUITE FAILED');
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);