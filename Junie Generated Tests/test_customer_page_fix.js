/**
 * Test: Customer page button should be active after DatabaseService fix
 * This test verifies that the DatabaseService returns correct queue status data
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
const BRANCH_ID = 1; // Ana Şube

// Simulate the DatabaseService.getQueueStatus method
async function getQueueStatus(branchId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/queue/status/${branchId}`);
    console.log('Raw API response:', JSON.stringify(response.data, null, 2));
    
    // This is the fixed version - return response.data.data instead of response.data
    return response.data.data;
  } catch (error) {
    console.error('Error getting queue status:', error.message);
    throw error;
  }
}

async function testCustomerPageFix() {
  console.log('🧪 Testing: Customer page fix - DatabaseService should return correct data');
  console.log('=' .repeat(70));

  try {
    // Step 1: Test the fixed DatabaseService method
    console.log('\n📊 Step 1: Testing fixed DatabaseService.getQueueStatus...');
    const queueStatus = await getQueueStatus(BRANCH_ID);
    
    console.log('Queue Status Data:', JSON.stringify(queueStatus, null, 2));

    // Step 2: Verify the data structure is correct
    console.log('\n✅ Step 2: Verifying data structure...');
    
    if (!queueStatus) {
      throw new Error('❌ FAIL: queueStatus is null or undefined');
    }
    
    if (typeof queueStatus.canTakeNumber === 'undefined') {
      throw new Error('❌ FAIL: canTakeNumber property is missing');
    }
    
    if (queueStatus.canTakeNumber !== true) {
      throw new Error('❌ FAIL: canTakeNumber should be true');
    }
    
    if (typeof queueStatus.activeCounters === 'undefined') {
      throw new Error('❌ FAIL: activeCounters property is missing');
    }
    
    console.log('✅ PASS: All required properties are present');
    console.log(`✅ PASS: canTakeNumber = ${queueStatus.canTakeNumber}`);
    console.log(`✅ PASS: activeCounters = ${queueStatus.activeCounters}`);
    console.log(`✅ PASS: waitingCount = ${queueStatus.waitingCount}`);

    // Step 3: Simulate button logic
    console.log('\n🔘 Step 3: Simulating button disable logic...');
    const isLoading = false; // Assume not loading
    const buttonDisabled = isLoading || !queueStatus?.canTakeNumber;
    
    console.log(`Button disabled logic: isLoading(${isLoading}) || !canTakeNumber(${!queueStatus?.canTakeNumber}) = ${buttonDisabled}`);
    
    if (buttonDisabled) {
      throw new Error('❌ FAIL: Button should be enabled but is disabled');
    }
    
    console.log('✅ PASS: Button should be enabled');

    // Step 4: Simulate info message logic
    console.log('\n💬 Step 4: Simulating info message logic...');
    const showInfoMessage = !queueStatus?.canTakeNumber && !isLoading;
    
    console.log(`Info message logic: !canTakeNumber(${!queueStatus?.canTakeNumber}) && !isLoading(${!isLoading}) = ${showInfoMessage}`);
    
    if (showInfoMessage) {
      throw new Error('❌ FAIL: "Şu anda sıra numarası alınamıyor" message should not be shown');
    }
    
    console.log('✅ PASS: Info message should not be shown');

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ DatabaseService fix is working correctly');
    console.log('✅ Customer page button should now be active');
    console.log('✅ "Şu anda sıra numarası alınamıyor" message should be hidden');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testCustomerPageFix();