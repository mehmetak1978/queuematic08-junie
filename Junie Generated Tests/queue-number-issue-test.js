/**
 * Test script to reproduce the queue number issue
 * Issue: Customer sees "0 Bilinmiyor Bekliyor" instead of actual queue number
 */

import DatabaseService from '../src/services/DatabaseService.js';
import Queue from '../src/models/Queue.js';
import Logger from '../src/utils/Logger.js';

async function testQueueNumberIssue() {
  console.log('🧪 Testing Queue Number Issue...\n');
  
  try {
    // Simulate getting a queue number (using branch ID 1 as example)
    const branchId = 1;
    console.log(`📋 Getting next queue number for branch ${branchId}...`);
    
    // Get API response
    const apiResponse = await DatabaseService.getNextQueueNumber(branchId);
    console.log('📡 API Response:', JSON.stringify(apiResponse, null, 2));
    
    // Create Queue object from API response
    const queueObj = Queue.fromAPI(apiResponse);
    console.log('\n🎫 Queue Object created:');
    console.log('- ID:', queueObj.id);
    console.log('- Queue Number:', queueObj.queueNumber);
    console.log('- Status:', queueObj.status);
    console.log('- Status Text:', queueObj.getStatusText());
    console.log('- Created At:', queueObj.createdAt);
    console.log('- Formatted Created At:', queueObj.getFormattedCreatedAt());
    
    // Check for the issue
    console.log('\n🔍 Issue Analysis:');
    if (queueObj.queueNumber === 0) {
      console.log('❌ ISSUE CONFIRMED: Queue number is 0');
      console.log('   - API returns "number" field but Queue model expects "queue_number" or "queueNumber"');
    } else {
      console.log('✅ Queue number is correct:', queueObj.queueNumber);
    }
    
    if (queueObj.getFormattedCreatedAt() === 'Bilinmiyor') {
      console.log('❌ ISSUE CONFIRMED: Created time shows "Bilinmiyor" (Unknown)');
      console.log('   - createdAt is null or undefined');
    } else {
      console.log('✅ Created time is correct:', queueObj.getFormattedCreatedAt());
    }
    
    console.log('\n📊 Expected vs Actual Display:');
    console.log(`Expected: "${apiResponse.data?.number || apiResponse.number} ${queueObj.getFormattedCreatedAt()} ${queueObj.getStatusText()}"`);
    console.log(`Actual: "${queueObj.queueNumber} ${queueObj.getFormattedCreatedAt()} ${queueObj.getStatusText()}"`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    Logger.error('Queue number test error:', error);
  }
}

// Run the test
testQueueNumberIssue();