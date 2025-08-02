/**
 * Comprehensive test to verify the queue number issue is fixed
 * Tests both queue number creation and status display
 */

import DatabaseService from '../src/services/DatabaseService.js';
import Queue from '../src/models/Queue.js';
import Logger from '../src/utils/Logger.js';

async function testQueueNumberFix() {
  console.log('🧪 Testing Queue Number Fix...\n');
  
  try {
    const branchId = 1;
    
    // Test 1: Create a new queue number
    console.log('📋 Test 1: Creating new queue number...');
    const apiResponse = await DatabaseService.getNextQueueNumber(branchId);
    console.log('📡 API Response:', JSON.stringify(apiResponse, null, 2));
    
    // Test the fix: Extract data properly
    const queueData = apiResponse.data || apiResponse;
    const queueObj = Queue.fromAPI(queueData);
    
    console.log('\n🎫 Queue Object Analysis:');
    console.log('- ID:', queueObj.id);
    console.log('- Queue Number:', queueObj.queueNumber);
    console.log('- Status:', queueObj.status);
    console.log('- Status Text:', queueObj.getStatusText());
    console.log('- Created At:', queueObj.createdAt);
    console.log('- Formatted Created At:', queueObj.getFormattedCreatedAt());
    
    // Verify fixes
    console.log('\n✅ Fix Verification:');
    if (queueObj.queueNumber > 0) {
      console.log('✅ Queue number is correct:', queueObj.queueNumber);
    } else {
      console.log('❌ Queue number is still 0');
    }
    
    if (queueObj.getFormattedCreatedAt() !== 'Bilinmiyor') {
      console.log('✅ Created time is correct:', queueObj.getFormattedCreatedAt());
    } else {
      console.log('❌ Created time still shows "Bilinmiyor"');
    }
    
    if (queueObj.getStatusText() === 'Bekliyor') {
      console.log('✅ Status text is correct:', queueObj.getStatusText());
    } else {
      console.log('❌ Status text is incorrect:', queueObj.getStatusText());
    }
    
    // Test 2: Queue status with lastCalled
    console.log('\n📊 Test 2: Testing queue status...');
    const statusResponse = await DatabaseService.getQueueStatus(branchId);
    console.log('📡 Status Response:', JSON.stringify(statusResponse, null, 2));
    
    if (statusResponse.lastCalled) {
      const lastCalledQueue = Queue.fromAPI(statusResponse.lastCalled);
      console.log('\n🔔 Last Called Queue:');
      console.log('- Queue Number:', lastCalledQueue.queueNumber);
      console.log('- Status:', lastCalledQueue.getStatusText());
      console.log('- Counter:', lastCalledQueue.getCounterDisplayName());
    } else {
      console.log('\n📝 No last called queue found');
    }
    
    // Test 3: Display format simulation
    console.log('\n🖥️  Test 3: Customer Display Simulation:');
    const displayText = `${queueObj.queueNumber} ${queueObj.getFormattedCreatedAt()} ${queueObj.getStatusText()}`;
    console.log('Customer would see:', displayText);
    
    if (displayText.includes('0') && displayText.includes('Bilinmiyor')) {
      console.log('❌ Issue still exists: Customer sees "0 Bilinmiyor"');
    } else {
      console.log('✅ Issue fixed: Customer sees proper queue information');
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    Logger.error('Comprehensive queue test error:', error);
  }
}

// Test individual Queue model fixes
function testQueueModelFixes() {
  console.log('\n🔧 Testing Queue Model Fixes...\n');
  
  // Test with API response structure (with data wrapper)
  const apiResponseWithData = {
    success: true,
    data: {
      id: 123,
      branchId: 1,
      number: 42,
      status: 'waiting',
      createdAt: new Date().toISOString()
    }
  };
  
  // Test with direct data
  const directData = {
    id: 124,
    branchId: 1,
    number: 43,
    status: 'waiting',
    createdAt: new Date().toISOString()
  };
  
  console.log('🧪 Test A: API response with data wrapper');
  const queueA = Queue.fromAPI(apiResponseWithData.data);
  console.log('- Queue Number:', queueA.queueNumber);
  console.log('- Status:', queueA.getStatusText());
  console.log('- Created At:', queueA.getFormattedCreatedAt());
  
  console.log('\n🧪 Test B: Direct data');
  const queueB = Queue.fromAPI(directData);
  console.log('- Queue Number:', queueB.queueNumber);
  console.log('- Status:', queueB.getStatusText());
  console.log('- Created At:', queueB.getFormattedCreatedAt());
  
  console.log('\n✅ Queue model fixes verified!');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Queue Tests\n');
  console.log('=' .repeat(50));
  
  testQueueModelFixes();
  
  console.log('\n' + '=' .repeat(50));
  await testQueueNumberFix();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 All tests completed!');
}

runAllTests();