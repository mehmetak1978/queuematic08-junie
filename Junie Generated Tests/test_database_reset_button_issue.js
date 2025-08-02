/**
 * Test Script: Database Reset Button Issue
 * Tests if "Sıra Numarası AL" button becomes inactive after database reset
 */

import fetch from 'node-fetch';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const BRANCH_ID = 1;

/**
 * Test API endpoint
 */
async function testAPI(endpoint, description) {
  try {
    console.log(`🔄 Testing: ${description}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.message || 'Unknown error'}`);
    }
    
    console.log(`✅ SUCCESS: ${description}`);
    return data;
  } catch (error) {
    console.log(`❌ FAILED: ${description} - ${error.message}`);
    return null;
  }
}

/**
 * Reset database using the setup script
 */
async function resetDatabase() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Resetting database...');
    
    const setupScript = spawn('node', ['backend/src/database/setup.js'], {
      cwd: projectRoot,
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    setupScript.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    setupScript.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    setupScript.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Database reset completed');
        console.log('📄 Setup output:', output.slice(-200)); // Show last 200 chars
        resolve();
      } else {
        console.log('❌ Database reset failed');
        console.log('📄 Error output:', errorOutput);
        reject(new Error(`Setup script failed with code ${code}`));
      }
    });
    
    setupScript.on('error', (error) => {
      console.log('❌ Failed to start setup script:', error.message);
      reject(error);
    });
  });
}

/**
 * Test queue status and button state
 */
async function testQueueStatus() {
  console.log('\n📊 Testing Queue Status API...');
  
  const statusData = await testAPI(`/queue/status/${BRANCH_ID}`, 'Get queue status');
  
  if (!statusData) {
    return false;
  }
  
  console.log('\n📋 Queue Status Response:');
  console.log(`   Success: ${statusData.success}`);
  console.log(`   Branch ID: ${statusData.data?.branchId}`);
  console.log(`   Branch Name: ${statusData.data?.branchName}`);
  console.log(`   Can Take Number: ${statusData.data?.canTakeNumber}`);
  console.log(`   Active Counters: ${statusData.data?.activeCounters}`);
  console.log(`   Waiting Count: ${statusData.data?.waitingCount}`);
  
  // Check if button should be active
  const canTakeNumber = statusData.data?.canTakeNumber;
  const buttonShouldBeActive = canTakeNumber === true;
  
  console.log('\n🎯 Button State Analysis:');
  console.log(`   canTakeNumber: ${canTakeNumber}`);
  console.log(`   Button should be: ${buttonShouldBeActive ? 'ACTIVE' : 'INACTIVE'}`);
  console.log(`   Warning message should be: ${buttonShouldBeActive ? 'HIDDEN' : 'SHOWN'}`);
  
  return buttonShouldBeActive;
}

/**
 * Test taking a queue number
 */
async function testTakeQueueNumber() {
  console.log('\n🎫 Testing Take Queue Number API...');
  
  const response = await fetch(`${API_BASE_URL}/queue/next-number`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ branchId: BRANCH_ID })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.log(`❌ FAILED: Take queue number - HTTP ${response.status}: ${errorData.message}`);
    return false;
  }
  
  const data = await response.json();
  console.log('✅ SUCCESS: Take queue number');
  console.log(`   Queue Number: ${data.data?.number}`);
  console.log(`   Status: ${data.data?.status}`);
  
  return true;
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🧪 Database Reset Button Issue Test');
  console.log('=====================================\n');
  
  try {
    // Step 1: Test initial state
    console.log('📍 STEP 1: Testing initial button state...');
    const initialButtonActive = await testQueueStatus();
    
    if (initialButtonActive) {
      console.log('✅ Initial state: Button is ACTIVE');
    } else {
      console.log('❌ Initial state: Button is INACTIVE');
    }
    
    // Step 2: Test taking a queue number before reset
    console.log('\n📍 STEP 2: Testing queue number taking before reset...');
    const canTakeNumberBefore = await testTakeQueueNumber();
    
    // Step 3: Reset database
    console.log('\n📍 STEP 3: Resetting database...');
    await resetDatabase();
    
    // Wait a moment for database to be ready
    console.log('⏳ Waiting 3 seconds for database to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Test button state after reset
    console.log('\n📍 STEP 4: Testing button state after database reset...');
    const buttonActiveAfterReset = await testQueueStatus();
    
    if (buttonActiveAfterReset) {
      console.log('✅ After reset: Button is ACTIVE');
    } else {
      console.log('❌ After reset: Button is INACTIVE');
    }
    
    // Step 5: Test taking a queue number after reset
    console.log('\n📍 STEP 5: Testing queue number taking after reset...');
    const canTakeNumberAfter = await testTakeQueueNumber();
    
    // Final analysis
    console.log('\n🎯 FINAL ANALYSIS:');
    console.log('==================');
    console.log(`Initial button state: ${initialButtonActive ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`Button state after reset: ${buttonActiveAfterReset ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`Can take number before reset: ${canTakeNumberBefore ? 'YES' : 'NO'}`);
    console.log(`Can take number after reset: ${canTakeNumberAfter ? 'YES' : 'NO'}`);
    
    if (initialButtonActive && !buttonActiveAfterReset) {
      console.log('\n🚨 ISSUE CONFIRMED: Button becomes INACTIVE after database reset!');
      return false;
    } else if (buttonActiveAfterReset) {
      console.log('\n✅ NO ISSUE: Button remains ACTIVE after database reset');
      return true;
    } else {
      console.log('\n⚠️  UNCLEAR: Button was already inactive before reset');
      return false;
    }
    
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