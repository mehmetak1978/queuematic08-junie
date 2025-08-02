/**
 * Test Script: Active Counters Independence
 * Tests if queue number taking works regardless of active counters count
 */

import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const BRANCH_ID = 1;

/**
 * Test queue status API
 */
async function testQueueStatus() {
  try {
    console.log('🔄 Testing queue status API...');
    const response = await fetch(`${API_BASE_URL}/queue/status/${BRANCH_ID}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Queue status API responded successfully');
    
    console.log('\n📋 Current Status:');
    console.log(`   Branch: ${data.data?.branchName}`);
    console.log(`   Can Take Number: ${data.data?.canTakeNumber}`);
    console.log(`   Active Counters: ${data.data?.activeCounters}`);
    console.log(`   Waiting Count: ${data.data?.waitingCount}`);
    
    return data.data;
  } catch (error) {
    console.log('❌ Queue status API failed:', error.message);
    return null;
  }
}

/**
 * Test taking queue number
 */
async function testTakeQueueNumber() {
  try {
    console.log('\n🎫 Testing take queue number API...');
    const response = await fetch(`${API_BASE_URL}/queue/next-number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ branchId: BRANCH_ID })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.message}`);
    }
    
    const data = await response.json();
    console.log('✅ Take queue number succeeded');
    console.log(`   Queue Number: ${data.data?.number}`);
    console.log(`   Status: ${data.data?.status}`);
    
    return true;
  } catch (error) {
    console.log('❌ Take queue number failed:', error.message);
    return false;
  }
}

/**
 * Simulate frontend button logic
 */
function simulateFrontendLogic(queueStatus, isLoading = false) {
  console.log('\n🖥️  Simulating Frontend Button Logic:');
  
  // Current button disable logic from CustomerApp.jsx
  const buttonDisabled = isLoading || !queueStatus?.canTakeNumber;
  
  // Info message logic
  const showInfoMessage = !queueStatus?.canTakeNumber && !isLoading;
  
  console.log(`   isLoading: ${isLoading}`);
  console.log(`   canTakeNumber: ${queueStatus?.canTakeNumber}`);
  console.log(`   activeCounters: ${queueStatus?.activeCounters}`);
  console.log(`   Button disabled: ${buttonDisabled}`);
  console.log(`   Show warning message: ${showInfoMessage}`);
  
  // Waiting time estimate logic
  const waitingCount = queueStatus?.waitingCount || 0;
  const activeCounters = queueStatus?.activeCounters || 1; // This is the fallback
  const avgServiceTime = 5; // minutes
  
  let waitingTimeEstimate;
  if (!waitingCount) {
    waitingTimeEstimate = 'Bekleme yok';
  } else {
    const estimatedMinutes = Math.ceil((waitingCount * avgServiceTime) / activeCounters);
    waitingTimeEstimate = `Yaklaşık ${estimatedMinutes} dakika`;
  }
  
  console.log(`   Waiting time estimate: ${waitingTimeEstimate}`);
  
  return {
    buttonDisabled,
    showInfoMessage,
    waitingTimeEstimate
  };
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🧪 Active Counters Independence Test');
  console.log('====================================\n');
  
  try {
    // Get current queue status
    const queueStatus = await testQueueStatus();
    
    if (!queueStatus) {
      console.log('❌ Cannot proceed without queue status');
      return false;
    }
    
    // Simulate frontend logic
    const frontendResult = simulateFrontendLogic(queueStatus);
    
    // Test actual API functionality
    const canTakeNumber = await testTakeQueueNumber();
    
    // Analysis
    console.log('\n🎯 ANALYSIS:');
    console.log('============');
    console.log(`Backend canTakeNumber: ${queueStatus.canTakeNumber}`);
    console.log(`Backend activeCounters: ${queueStatus.activeCounters}`);
    console.log(`Frontend button disabled: ${frontendResult.buttonDisabled}`);
    console.log(`API actually works: ${canTakeNumber}`);
    
    // Check for independence
    const isIndependent = queueStatus.canTakeNumber === true && canTakeNumber === true;
    
    if (isIndependent) {
      console.log('\n✅ SUCCESS: Queue number taking is independent of active counters');
      console.log('   - Backend correctly returns canTakeNumber: true');
      console.log('   - Frontend button logic only depends on canTakeNumber');
      console.log('   - API functionality works regardless of active counters');
    } else {
      console.log('\n❌ ISSUE: Queue number taking depends on active counters');
      console.log('   - This violates the requirement for independence');
    }
    
    // Special case: Check behavior when activeCounters is 0
    if (queueStatus.activeCounters === 0) {
      console.log('\n⚠️  SPECIAL CASE: Zero Active Counters');
      console.log('   - This is the scenario mentioned in the issue');
      console.log(`   - Button should still work: ${!frontendResult.buttonDisabled ? 'YES' : 'NO'}`);
      console.log(`   - API should still work: ${canTakeNumber ? 'YES' : 'NO'}`);
    }
    
    return isIndependent;
    
  } catch (error) {
    console.log('\n💥 Test failed with error:', error.message);
    return false;
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});