/**
 * Queuematic Backend API Server
 * Main server file that sets up Express app with all routes and middleware
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import configuration
import appConfig from './config/appConfig.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import branchRoutes from './routes/branches.js';
import counterRoutes from './routes/counters.js';
import queueRoutes from './routes/queue.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './middleware/logger.js';

const app = express();
const PORT = appConfig.server.port;

// Security middleware
app.use(helmet());

// CORS configuration - MUST be before rate limiting to handle preflight requests
app.use(cors({
  origin: appConfig.cors.allowedOrigins,
  credentials: appConfig.cors.credentials,
  methods: appConfig.cors.methods,
  allowedHeaders: appConfig.cors.allowedHeaders
}));

// Rate limiting
const limiter = rateLimit(appConfig.rateLimit);
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: appConfig.security.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: appConfig.security.bodyLimit }));

// Custom logging middleware
app.use(logger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: appConfig.server.environment
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/counters', counterRoutes);
app.use('/api/queue', queueRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Queuematic API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${appConfig.server.environment}`);
  console.log(`🔗 Allowed CORS Origins: ${appConfig.cors.allowedOrigins.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;