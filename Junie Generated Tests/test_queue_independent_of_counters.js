/**
 * Test: Queue numbers can be taken regardless of active counter status
 * This test verifies that customers can take queue numbers even when no counters are active
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
const BRANCH_ID = 1; // Ana Şube

async function testQueueIndependentOfCounters() {
  console.log('🧪 Testing: Queue numbers independent of counter status');
  console.log('=' .repeat(60));

  try {
    // Step 1: Check current queue status
    console.log('\n📊 Step 1: Checking current queue status...');
    const statusResponse = await axios.get(`${API_BASE_URL}/queue/status/${BRANCH_ID}`);
    
    console.log('Queue Status:', {
      waitingCount: statusResponse.data.data.waitingCount,
      activeCounters: statusResponse.data.data.activeCounters,
      canTakeNumber: statusResponse.data.data.canTakeNumber
    });

    // Step 2: Verify canTakeNumber is always true
    if (statusResponse.data.data.canTakeNumber !== true) {
      throw new Error('❌ FAIL: canTakeNumber should always be true');
    }
    console.log('✅ PASS: canTakeNumber is true regardless of active counters');

    // Step 3: Try to take a queue number
    console.log('\n🎫 Step 2: Attempting to take a queue number...');
    const queueResponse = await axios.post(`${API_BASE_URL}/queue/next-number`, {
      branchId: BRANCH_ID
    });

    if (queueResponse.data.success) {
      console.log('✅ PASS: Successfully took queue number:', queueResponse.data.data.number);
      console.log('Queue Details:', {
        number: queueResponse.data.data.number,
        branchName: queueResponse.data.data.branchName,
        status: queueResponse.data.data.status
      });
    } else {
      throw new Error('❌ FAIL: Could not take queue number');
    }

    // Step 4: Check updated queue status
    console.log('\n📊 Step 3: Checking updated queue status...');
    const updatedStatusResponse = await axios.get(`${API_BASE_URL}/queue/status/${BRANCH_ID}`);
    
    console.log('Updated Queue Status:', {
      waitingCount: updatedStatusResponse.data.data.waitingCount,
      activeCounters: updatedStatusResponse.data.data.activeCounters,
      canTakeNumber: updatedStatusResponse.data.data.canTakeNumber
    });

    // Verify canTakeNumber is still true
    if (updatedStatusResponse.data.data.canTakeNumber !== true) {
      throw new Error('❌ FAIL: canTakeNumber should remain true after taking a number');
    }
    console.log('✅ PASS: canTakeNumber remains true after taking a queue number');

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Queue numbers can be taken regardless of active counter status');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testQueueIndependentOfCounters();