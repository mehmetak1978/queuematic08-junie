/**
 * Database Setup Script
 * Creates and initializes the PostgreSQL database for Queuematic System
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AppConfig from '../config/AppConfig.js';
import Logger from '../utils/Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseSetup {
  constructor() {
    this.config = AppConfig.get('database');
    this.schemaPath = path.join(__dirname, 'schema.sql');
  }

  /**
   * Create database connection
   * @param {boolean} includeDatabase - Whether to include database name in connection
   * @returns {Client} PostgreSQL client
   */
  createConnection(includeDatabase = true) {
    const connectionConfig = {
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password
    };

    if (includeDatabase) {
      connectionConfig.database = this.config.database;
    }

    return new Client(connectionConfig);
  }

  /**
   * Check if database exists
   * @returns {Promise<boolean>} True if database exists
   */
  async databaseExists() {
    const client = this.createConnection(false);
    
    try {
      await client.connect();
      Logger.info('Connected to PostgreSQL server');
      
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [this.config.database]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      Logger.error('Error checking database existence:', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Create database if it doesn't exist
   * @returns {Promise<void>}
   */
  async createDatabase() {
    const client = this.createConnection(false);
    
    try {
      await client.connect();
      Logger.info(`Creating database: ${this.config.database}`);
      
      await client.query(`CREATE DATABASE "${this.config.database}"`);
      Logger.info(`Database ${this.config.database} created successfully`);
    } catch (error) {
      if (error.code === '42P04') {
        Logger.info(`Database ${this.config.database} already exists`);
      } else {
        Logger.error('Error creating database:', error);
        throw error;
      }
    } finally {
      await client.end();
    }
  }

  /**
   * Execute SQL schema file
   * @returns {Promise<void>}
   */
  async executeSchema() {
    const client = this.createConnection(true);
    
    try {
      await client.connect();
      Logger.info('Connected to database, executing schema...');
      
      // Read schema file
      const schemaSQL = fs.readFileSync(this.schemaPath, 'utf8');
      
      // Execute schema
      await client.query(schemaSQL);
      Logger.info('Database schema executed successfully');
      
      // Verify tables were created
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      const tables = result.rows.map(row => row.table_name);
      Logger.info('Created tables:', tables);
      
    } catch (error) {
      Logger.error('Error executing schema:', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Test database connection and basic operations
   * @returns {Promise<void>}
   */
  async testConnection() {
    const client = this.createConnection(true);
    
    try {
      await client.connect();
      Logger.info('Testing database connection...');
      
      // Test basic query
      const result = await client.query('SELECT NOW() as current_time');
      Logger.info('Database connection test successful:', result.rows[0]);
      
      // Test sample data
      const branchResult = await client.query('SELECT COUNT(*) as count FROM branches');
      const userResult = await client.query('SELECT COUNT(*) as count FROM users');
      const counterResult = await client.query('SELECT COUNT(*) as count FROM counters');
      
      Logger.info(`Sample data loaded - Branches: ${branchResult.rows[0].count}, Users: ${userResult.rows[0].count}, Counters: ${counterResult.rows[0].count}`);
      
    } catch (error) {
      Logger.error('Database connection test failed:', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Complete database setup process
   * @returns {Promise<void>}
   */
  async setup() {
    try {
      Logger.info('🚀 Starting database setup...');
      
      // Check if database exists
      const exists = await this.databaseExists();
      
      if (!exists) {
        // Create database
        await this.createDatabase();
      } else {
        Logger.info(`Database ${this.config.database} already exists`);
      }
      
      // Execute schema
      await this.executeSchema();
      
      // Test connection
      await this.testConnection();
      
      Logger.info('✅ Database setup completed successfully!');
      
    } catch (error) {
      Logger.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  /**
   * Reset database (drop and recreate)
   * @returns {Promise<void>}
   */
  async reset() {
    const client = this.createConnection(false);
    
    try {
      Logger.info('🔄 Resetting database...');
      
      await client.connect();
      
      // Terminate existing connections to the database
      await client.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [this.config.database]);
      
      // Drop database if exists
      await client.query(`DROP DATABASE IF EXISTS "${this.config.database}"`);
      Logger.info(`Database ${this.config.database} dropped`);
      
      // Recreate database
      await client.query(`CREATE DATABASE "${this.config.database}"`);
      Logger.info(`Database ${this.config.database} recreated`);
      
      await client.end();
      
      // Execute schema
      await this.executeSchema();
      
      // Test connection
      await this.testConnection();
      
      Logger.info('✅ Database reset completed successfully!');
      
    } catch (error) {
      Logger.error('❌ Database reset failed:', error);
      throw error;
    } finally {
      if (client._connected) {
        await client.end();
      }
    }
  }
}

// Export the class and create instance for direct usage
export default DatabaseSetup;

// If this file is run directly, execute setup
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new DatabaseSetup();
  
  const command = process.argv[2];
  
  if (command === 'reset') {
    setup.reset().catch(error => {
      Logger.error('Setup failed:', error);
      process.exit(1);
    });
  } else {
    setup.setup().catch(error => {
      Logger.error('Setup failed:', error);
      process.exit(1);
    });
  }
}