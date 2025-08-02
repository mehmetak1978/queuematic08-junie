/**
 * Reproduction Script for Queue ID Error
 * This script reproduces the "Queue ID is required" error that occurs
 * when setup-db is run and counter-sessions table is empty
 */

import DatabaseService from '../src/services/DatabaseService.js';
import AuthService from '../src/services/AuthService.js';
import Logger from '../src/utils/Logger.js';

/**
 * Simulate the error scenario
 */
async function reproduceError() {
  Logger.info('🔄 Starting Queue ID Error Reproduction Test');
  Logger.info('==============================================');
  
  try {
    // Step 1: Try to login as clerk1
    Logger.info('Step 1: Attempting to login as clerk1...');
    const loginResult = await DatabaseService.login('clerk1', 'password123');
    Logger.info('✅ Login successful:', loginResult);
    
    // Step 2: Try to get available counters
    Logger.info('Step 2: Getting available counters...');
    const counters = await DatabaseService.getAvailableCounters(1, loginResult.token);
    Logger.info('Available counters:', counters);
    
    // Step 3: Try to start a counter session (this should work)
    if (counters && counters.length > 0) {
      Logger.info('Step 3: Starting counter session...');
      const sessionResult = await DatabaseService.startCounterSession(
        counters[0].id, 
        loginResult.token
      );
      Logger.info('✅ Counter session started:', sessionResult);
      
      // Step 4: Try to call next customer (this might fail if no queue exists)
      Logger.info('Step 4: Attempting to call next customer...');
      try {
        const queueResult = await DatabaseService.callNextCustomer(
          counters[0].id,
          loginResult.token
        );
        Logger.info('Queue result:', queueResult);
        
        // Step 5: Try to complete service (this is where the error occurs)
        if (queueResult && queueResult.id) {
          Logger.info('Step 5: Attempting to complete service...');
          await DatabaseService.completeService(queueResult.id, loginResult.token);
          Logger.info('✅ Service completed successfully');
        } else {
          Logger.warning('⚠️ No queue ID returned from callNextCustomer');
          Logger.info('Step 5: Attempting to complete service with null ID...');
          await DatabaseService.completeService(null, loginResult.token);
        }
      } catch (error) {
        Logger.error('❌ Error in queue operations:', error.message);
        Logger.error('This reproduces the "Queue ID is required" error');
      }
    } else {
      Logger.warning('⚠️ No available counters found');
    }
    
  } catch (error) {
    Logger.error('❌ Error during reproduction test:', error.message);
    Logger.error('Full error:', error);
  }
  
  Logger.info('🏁 Reproduction test completed');
}

/**
 * Check database state
 */
async function checkDatabaseState() {
  Logger.info('🔍 Checking Database State');
  Logger.info('==========================');
  
  try {
    // This would require direct database access
    // For now, we'll just log what we expect to find
    Logger.info('Expected issues:');
    Logger.info('- counter_sessions table is empty (no active sessions)');
    Logger.info('- queue table might be empty (no customers waiting)');
    Logger.info('- API endpoints expect active counter sessions for queue operations');
    
  } catch (error) {
    Logger.error('❌ Error checking database state:', error.message);
  }
}

// Run the reproduction test
async function main() {
  await checkDatabaseState();
  await reproduceError();
}

// Export for testing
export { reproduceError, checkDatabaseState };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    Logger.error('💥 Unhandled error in reproduction script:', error);
    process.exit(1);
  });
}