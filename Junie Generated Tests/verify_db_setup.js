/**
 * Verification script to check database setup
 * Verifies that counter_sessions and queue tables are empty after setup
 */

import { pool, closePool } from '../backend/src/config/database.js';

async function verifyDatabaseSetup() {
  console.log('🔍 Verifying database setup changes...');
  
  try {
    // Check counter_sessions table
    const counterSessionsResult = await pool.query('SELECT COUNT(*) as count FROM counter_sessions');
    const counterSessionsCount = parseInt(counterSessionsResult.rows[0].count);
    
    // Check queue table
    const queueResult = await pool.query('SELECT COUNT(*) as count FROM queue');
    const queueCount = parseInt(queueResult.rows[0].count);
    
    // Check other tables still have sample data
    const branchesResult = await pool.query('SELECT COUNT(*) as count FROM branches');
    const branchesCount = parseInt(branchesResult.rows[0].count);
    
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const usersCount = parseInt(usersResult.rows[0].count);
    
    const countersResult = await pool.query('SELECT COUNT(*) as count FROM counters');
    const countersCount = parseInt(countersResult.rows[0].count);
    
    console.log('\n📊 Table row counts:');
    console.log(`   counter_sessions: ${counterSessionsCount}`);
    console.log(`   queue: ${queueCount}`);
    console.log(`   branches: ${branchesCount}`);
    console.log(`   users: ${usersCount}`);
    console.log(`   counters: ${countersCount}`);
    
    // Verify expectations
    let success = true;
    
    if (counterSessionsCount !== 0) {
      console.log('❌ FAIL: counter_sessions table should be empty');
      success = false;
    } else {
      console.log('✅ PASS: counter_sessions table is empty');
    }
    
    if (queueCount !== 0) {
      console.log('❌ FAIL: queue table should be empty');
      success = false;
    } else {
      console.log('✅ PASS: queue table is empty');
    }
    
    if (branchesCount === 0) {
      console.log('❌ FAIL: branches table should have sample data');
      success = false;
    } else {
      console.log('✅ PASS: branches table has sample data');
    }
    
    if (usersCount === 0) {
      console.log('❌ FAIL: users table should have sample data');
      success = false;
    } else {
      console.log('✅ PASS: users table has sample data');
    }
    
    if (countersCount === 0) {
      console.log('❌ FAIL: counters table should have sample data');
      success = false;
    } else {
      console.log('✅ PASS: counters table has sample data');
    }
    
    if (success) {
      console.log('\n🎉 All verification tests passed!');
      console.log('✅ Database setup correctly excludes sample data for counter_sessions and queue tables');
    } else {
      console.log('\n❌ Some verification tests failed');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await closePool();
  }
}

verifyDatabaseSetup();