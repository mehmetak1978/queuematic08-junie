/**
 * Database Reset Script
 * Resets the database by dropping all tables and recreating them
 * WARNING: This will delete all data!
 */

import { setupDatabase } from './setup.js';
import { pool, closePool } from '../config/database.js';

/**
 * Drop all tables and related objects
 */
const dropAllTables = async () => {
  try {
    console.log('🗑️  Dropping all tables and objects...');
    
    const client = await pool.connect();
    
    try {
      // Drop tables in correct order (reverse of creation due to foreign keys)
      const dropCommands = [
        'DROP TABLE IF EXISTS queue CASCADE',
        'DROP TABLE IF EXISTS counter_sessions CASCADE',
        'DROP TABLE IF EXISTS counters CASCADE',
        'DROP TABLE IF EXISTS users CASCADE',
        'DROP TABLE IF EXISTS branches CASCADE',
        'DROP VIEW IF EXISTS active_queue_status CASCADE',
        'DROP VIEW IF EXISTS daily_queue_stats CASCADE',
        'DROP FUNCTION IF EXISTS reset_daily_queue() CASCADE',
        'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE'
      ];
      
      for (const command of dropCommands) {
        try {
          await client.query(command);
          console.log(`✅ ${command}`);
        } catch (error) {
          console.log(`⚠️  ${command} - ${error.message}`);
        }
      }
      
      console.log('✅ All tables and objects dropped successfully');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error dropping tables:', error.message);
    throw error;
  }
};

/**
 * Verify database is clean
 */
const verifyCleanDatabase = async () => {
  try {
    console.log('🔍 Verifying database is clean...');
    
    // Check for remaining tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const remainingTables = tablesResult.rows.map(row => row.table_name);
    
    if (remainingTables.length > 0) {
      console.log('⚠️  Remaining tables:', remainingTables.join(', '));
    } else {
      console.log('✅ Database is clean - no tables remaining');
    }
    
    // Check for remaining views
    const viewsResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const remainingViews = viewsResult.rows.map(row => row.table_name);
    
    if (remainingViews.length > 0) {
      console.log('⚠️  Remaining views:', remainingViews.join(', '));
    } else {
      console.log('✅ No views remaining');
    }
    
    // Check for remaining functions
    const functionsResult = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `);
    
    const remainingFunctions = functionsResult.rows.map(row => row.routine_name);
    
    if (remainingFunctions.length > 0) {
      console.log('⚠️  Remaining functions:', remainingFunctions.join(', '));
    } else {
      console.log('✅ No custom functions remaining');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error verifying clean database:', error.message);
    return false;
  }
};

/**
 * Main reset function
 */
const resetDatabase = async () => {
  console.log('🔄 Starting Queuematic Database Reset');
  console.log('====================================');
  console.log('⚠️  WARNING: This will delete ALL data!');
  
  try {
    // Drop all tables
    await dropAllTables();
    
    // Verify database is clean
    console.log('\n🔍 Verifying clean state...');
    await verifyCleanDatabase();
    
    // Recreate database with fresh schema
    console.log('\n🔧 Recreating database with fresh schema...');
    await setupDatabase();
    
    console.log('\n🎉 Database reset completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Database reset failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
};

/**
 * Interactive confirmation for reset
 */
const confirmReset = () => {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('⚠️  Are you sure you want to reset the database? This will DELETE ALL DATA! (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
};

/**
 * Handle script execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check if running with --force flag
  const forceReset = process.argv.includes('--force');
  
  if (forceReset) {
    console.log('🚀 Force reset mode - skipping confirmation');
    resetDatabase().catch(error => {
      console.error('💥 Unhandled error:', error);
      process.exit(1);
    });
  } else {
    // Interactive mode - ask for confirmation
    confirmReset().then(confirmed => {
      if (confirmed) {
        resetDatabase().catch(error => {
          console.error('💥 Unhandled error:', error);
          process.exit(1);
        });
      } else {
        console.log('❌ Database reset cancelled');
        process.exit(0);
      }
    });
  }
}

export { resetDatabase, dropAllTables, verifyCleanDatabase };