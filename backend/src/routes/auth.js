/**
 * Authentication Routes
 * Handles user login, logout, and token validation
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { generateToken, authenticate, checkAuthRateLimit } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return token
 * @access  Public
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    throw new AppError('Username and password are required', 400);
  }

  // Check rate limiting
  const clientId = req.ip + ':' + username;
  if (!checkAuthRateLimit(clientId)) {
    throw new AppError('Too many login attempts. Please try again later.', 429);
  }

  // Get user from database
  const userResult = await query(
    `SELECT u.id, u.username, u.password_hash, u.role, u.branch_id, u.is_active,
            b.name as branch_name
     FROM users u
     LEFT JOIN branches b ON u.branch_id = b.id
     WHERE u.username = $1`,
    [username]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('Invalid credentials', 401);
  }

  const user = userResult.rows[0];

  // Check if user is active
  if (!user.is_active) {
    throw new AppError('Account is deactivated', 401);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    branchId: user.branch_id
  });

  // Update last login
  await query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  // Return user data and token
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branch_id,
        branchName: user.branch_name
      },
      token
    }
  });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token on client side)
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // In a more sophisticated system, we would maintain a blacklist of tokens
  // For now, we just return success and let the client handle token removal
  
  // Update last logout time
  await query(
    'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [req.user.id]
  );

  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  // Get updated user data
  const userResult = await query(
    `SELECT u.id, u.username, u.role, u.branch_id, u.is_active,
            b.name as branch_name, b.address as branch_address
     FROM users u
     LEFT JOIN branches b ON u.branch_id = b.id
     WHERE u.id = $1`,
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = userResult.rows[0];

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branch_id,
        branchName: user.branch_name,
        branchAddress: user.branch_address,
        isActive: user.is_active
      }
    }
  });
}));

/**
 * @route   POST /api/auth/validate-token
 * @desc    Validate JWT token
 * @access  Private
 */
router.post('/validate-token', authenticate, asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    data: {
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        branchId: req.user.branch_id
      }
    }
  });
}));

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters long', 400);
  }

  // Get current user with password
  const userResult = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = userResult.rows[0];

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Hash new password
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPasswordHash, req.user.id]
  );

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
}));

export default router;