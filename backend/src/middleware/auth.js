/**
 * Authentication Middleware
 * Handles JWT token verification and user authorization
 */

import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { AppError } from './errorHandler.js';

/**
 * JWT secret key
 */
const JWT_SECRET = process.env.JWT_SECRET || 'queuematic-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Authentication middleware - verifies JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token is required', 401);
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const userResult = await query(
      'SELECT id, username, role, branch_id, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 401);
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_active) {
      throw new AppError('User account is deactivated', 401);
    }
    
    // Add user to request object
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

/**
 * Authorization middleware - checks user role
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    
    next();
  };
};

/**
 * Branch access middleware - ensures user can access branch data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const checkBranchAccess = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  
  // Admin can access all branches
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Get branch ID from request (params, body, or query)
  const requestedBranchId = parseInt(
    req.params.branchId || 
    req.body.branchId || 
    req.query.branchId
  );
  
  // If no branch ID in request, use user's branch
  if (!requestedBranchId) {
    req.branchId = req.user.branch_id;
    return next();
  }
  
  // Check if user can access the requested branch
  if (req.user.branch_id !== requestedBranchId) {
    return next(new AppError('Access denied to this branch', 403));
  }
  
  req.branchId = requestedBranchId;
  next();
};

/**
 * Optional authentication middleware - doesn't fail if no token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const userResult = await query(
      'SELECT id, username, role, branch_id, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
      req.user = userResult.rows[0];
      req.token = token;
    }
    
    next();
  } catch {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Rate limiting for authentication attempts
 */
const authAttempts = new Map();

/**
 * Check authentication rate limit
 * @param {string} identifier - IP address or username
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} Whether request is allowed
 */
export const checkAuthRateLimit = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const attempts = authAttempts.get(identifier) || { count: 0, resetTime: now + windowMs };
  
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }
  
  attempts.count++;
  authAttempts.set(identifier, attempts);
  
  return attempts.count <= maxAttempts;
};

export default {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  checkBranchAccess,
  optionalAuth,
  checkAuthRateLimit
};