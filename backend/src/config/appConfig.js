/**
 * Central Application Configuration
 * Contains all configuration parameters for the Queuematic application
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const appConfig = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3008,
    environment: process.env.NODE_ENV || 'development'
  },

  // CORS Configuration
  cors: {
    // Allow multiple origins for development flexibility
    allowedOrigins: [
      process.env.FRONTEND_URL || 'http://localhost:5174',
      'http://localhost:5173', // Fallback for default Vite port
      'http://localhost:3000', // Common React dev port
      'http://localhost:5174'  // Current frontend port
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'queuematic08',
    user: process.env.DB_USER || 'qm_user',
    password: process.env.DB_PASSWORD || 'PSWD'
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'queuematic-secret-key-2024-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'INFO',
    colors: {
      INFO: '\x1b[32m',    // GREEN
      WARNING: '\x1b[33m', // YELLOW
      ERROR: '\x1b[31m',   // RED
      DEBUG: '\x1b[34m',   // BLUE
      RESET: '\x1b[0m'     // RESET
    }
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 minute for dev, 15 minutes for prod
    max: process.env.NODE_ENV === 'development' ? 10000 : 1000, // Higher limit for development
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for health checks and preflight requests
    skip: (req) => {
      return req.path === '/health' || req.method === 'OPTIONS';
    }
  },

  // Refresh Intervals (in milliseconds)
  refreshIntervals: {
    queueStatus: 5000,        // 5 seconds
    counterStatus: 3000,      // 3 seconds
    branchStatus: 10000,      // 10 seconds
    userSession: 30000,       // 30 seconds
    healthCheck: 60000        // 1 minute
  },

  // Security Configuration
  security: {
    bodyLimit: '10mb',
    helmetEnabled: true
  },

  // Development Configuration
  development: {
    enableDetailedLogs: process.env.NODE_ENV === 'development',
    enableCORSDebug: process.env.NODE_ENV === 'development'
  }
};

export default appConfig;