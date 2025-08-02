/**
 * Database Setup Script
 * Initializes PostgreSQL database with schema and sample data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { pool, closePool } from '../config/database.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Read SQL file content
 * @param {string} filename - SQL file name
 * @returns {string} SQL content
 */
const readSQLFile = (filename) => {
  const filePath = path.join(__dirname, filename);
  return fs.readFileSync(filePath, 'utf8');
};

/**
 * Execute SQL commands from file
 * @param {string} sqlContent - SQL content to execute
 */
const executeSQLFile = async (sqlContent) => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Executing SQL commands...');
    
    // Execute the entire SQL content as one transaction
    // This handles PostgreSQL functions and complex statements properly
    await client.query(sqlContent);
    console.log('✅ All SQL commands executed successfully');
    
  } catch (error) {
    console.error('❌ Error executing SQL file:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    console.log('🔄 Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL Version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

/**
 * Verify schema setup
 */
const verifySetup = async () => {
  try {
    console.log('🔄 Verifying database setup...');
    
    // Check if all tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const expectedTables = ['branches', 'users', 'counters', 'counter_sessions', 'queue'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    console.log('📋 Existing tables:', existingTables.join(', '));
    
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables.join(', '));
      return false;
    }
    
    // Check sample data
    const branchCount = await pool.query('SELECT COUNT(*) as count FROM branches');
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const counterCount = await pool.query('SELECT COUNT(*) as count FROM counters');
    
    console.log('📊 Sample data:');
    console.log(`   Branches: ${branchCount.rows[0].count}`);
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Counters: ${counterCount.rows[0].count}`);
    
    // Check views
    const viewsResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const existingViews = viewsResult.rows.map(row => row.table_name);
    console.log('👁️  Views:', existingViews.join(', '));
    
    console.log('✅ Database setup verification completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error verifying setup:', error.message);
    return false;
  }
};

/**
 * Main setup function
 */
const setupDatabase = async () => {
  console.log('🚀 Starting Queuematic Database Setup');
  console.log('=====================================');
  
  try {
    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      process.exit(1);
    }
    
    // Read and execute schema
    console.log('\n📄 Reading schema file...');
    const schemaSQL = readSQLFile('schema.sql');
    console.log(`   Schema file size: ${schemaSQL.length} characters`);
    
    console.log('\n🔧 Setting up database schema...');
    await executeSQLFile(schemaSQL);
    
    // Verify setup
    console.log('\n🔍 Verifying setup...');
    const verificationOk = await verifySetup();
    
    if (verificationOk) {
      console.log('\n🎉 Database setup completed successfully!');
      console.log('\n📝 Default login credentials:');
      console.log('   Admin: username="admin", password="password123"');
      console.log('   Clerk1: username="clerk1", password="password123"');
      console.log('   Clerk2: username="clerk2", password="password123"');
      console.log('   Clerk3: username="clerk3", password="password123"');
      console.log('   Clerk4: username="clerk4", password="password123"');
      console.log('\n⚠️  Remember to change default passwords in production!');
    } else {
      console.log('\n❌ Database setup verification failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
};

/**
 * Handle script execution
 */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  setupDatabase().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

export { setupDatabase, testConnection, verifySetup };