/**
 * User Routes
 * Handles user management operations
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const usersResult = await query(
    `SELECT u.id, u.username, u.role, u.branch_id, u.is_active, 
            u.created_at, u.last_login,
            b.name as branch_name
     FROM users u
     LEFT JOIN branches b ON u.branch_id = b.id
     ORDER BY u.created_at DESC`
  );

  res.status(200).json({
    success: true,
    data: usersResult.rows.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branch_id,
      branchName: user.branch_name,
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLogin: user.last_login
    }))
  });
}));

/**
 * GET /api/users/:id
 * Get user by ID (admin only)
 */
router.get('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const userResult = await query(
    `SELECT u.id, u.username, u.role, u.branch_id, u.is_active, 
            u.created_at, u.updated_at, u.last_login,
            b.name as branch_name, b.address as branch_address
     FROM users u
     LEFT JOIN branches b ON u.branch_id = b.id
     WHERE u.id = $1`,
    [id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = userResult.rows[0];

  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branch_id,
      branchName: user.branch_name,
      branchAddress: user.branch_address,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login
    }
  });
}));

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { username, password, role, branchId } = req.body;

  // Validate input
  if (!username || !password || !role) {
    throw new AppError('Username, password, and role are required', 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400);
  }

  if (!['admin', 'clerk'].includes(role)) {
    throw new AppError('Role must be either admin or clerk', 400);
  }

  if (role === 'clerk' && !branchId) {
    throw new AppError('Branch ID is required for clerk role', 400);
  }

  // Check if username already exists
  const existingUserResult = await query(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );

  if (existingUserResult.rows.length > 0) {
    throw new AppError('Username already exists', 409);
  }

  // Validate branch exists if provided
  if (branchId) {
    const branchResult = await query(
      'SELECT id FROM branches WHERE id = $1',
      [branchId]
    );

    if (branchResult.rows.length === 0) {
      throw new AppError('Branch not found', 400);
    }
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userResult = await query(
    `INSERT INTO users (username, password_hash, role, branch_id, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, username, role, branch_id, is_active, created_at`,
    [username, passwordHash, role, branchId || null]
  );

  const newUser = userResult.rows[0];

  // Get branch name if applicable
  let branchName = null;
  if (newUser.branch_id) {
    const branchResult = await query(
      'SELECT name FROM branches WHERE id = $1',
      [newUser.branch_id]
    );
    branchName = branchResult.rows[0]?.name;
  }

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      branchId: newUser.branch_id,
      branchName,
      isActive: newUser.is_active,
      createdAt: newUser.created_at
    }
  });
}));

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, role, branchId, isActive } = req.body;

  // Check if user exists
  const existingUserResult = await query(
    'SELECT id, username, role FROM users WHERE id = $1',
    [id]
  );

  if (existingUserResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const existingUser = existingUserResult.rows[0];

  // Prevent admin from deactivating themselves
  if (req.user.id === parseInt(id) && isActive === false) {
    throw new AppError('Cannot deactivate your own account', 400);
  }

  // Validate role if provided
  if (role && !['admin', 'clerk'].includes(role)) {
    throw new AppError('Role must be either admin or clerk', 400);
  }

  // Validate branch if role is clerk
  if (role === 'clerk' && !branchId) {
    throw new AppError('Branch ID is required for clerk role', 400);
  }

  // Check if new username already exists (if username is being changed)
  if (username && username !== existingUser.username) {
    const duplicateResult = await query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, id]
    );

    if (duplicateResult.rows.length > 0) {
      throw new AppError('Username already exists', 409);
    }
  }

  // Validate branch exists if provided
  if (branchId) {
    const branchResult = await query(
      'SELECT id FROM branches WHERE id = $1',
      [branchId]
    );

    if (branchResult.rows.length === 0) {
      throw new AppError('Branch not found', 400);
    }
  }

  // Update user
  const updateResult = await query(
    `UPDATE users 
     SET username = COALESCE($1, username),
         role = COALESCE($2, role),
         branch_id = CASE WHEN $3::integer IS NOT NULL THEN $3 ELSE branch_id END,
         is_active = COALESCE($4, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING id, username, role, branch_id, is_active, updated_at`,
    [username, role, branchId, isActive, id]
  );

  const updatedUser = updateResult.rows[0];

  // Get branch name if applicable
  let branchName = null;
  if (updatedUser.branch_id) {
    const branchResult = await query(
      'SELECT name FROM branches WHERE id = $1',
      [updatedUser.branch_id]
    );
    branchName = branchResult.rows[0]?.name;
  }

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      branchId: updatedUser.branch_id,
      branchName,
      isActive: updatedUser.is_active,
      updatedAt: updatedUser.updated_at
    }
  });
}));

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (req.user.id === parseInt(id)) {
    throw new AppError('Cannot delete your own account', 400);
  }

  // Check if user exists
  const userResult = await query(
    'SELECT id, username FROM users WHERE id = $1',
    [id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  // Soft delete by deactivating the user
  await query(
    'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully'
  });
}));

/**
 * POST /api/users/:id/reset-password
 * Reset user password (admin only)
 */
router.post('/:id/reset-password', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    throw new AppError('New password is required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400);
  }

  // Check if user exists
  const userResult = await query(
    'SELECT id, username FROM users WHERE id = $1',
    [id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  // Hash new password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, id]
  );

  res.status(200).json({
    success: true,
    message: 'Password reset successfully'
  });
}));

export default router;