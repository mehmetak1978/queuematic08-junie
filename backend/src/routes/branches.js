/**
 * Branch Routes
 * Handles branch management operations
 */

import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/branches
 * Get all branches
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const branchesResult = await query(
    `SELECT id, name, address, phone, is_active, created_at, updated_at
     FROM branches
     WHERE is_active = true
     ORDER BY name ASC`
  );

  res.status(200).json({
    success: true,
    data: branchesResult.rows.map(branch => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.is_active,
      createdAt: branch.created_at,
      updatedAt: branch.updated_at
    }))
  });
}));

/**
 * GET /api/branches/:id
 * Get branch by ID
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const branchResult = await query(
    `SELECT b.id, b.name, b.address, b.phone, b.is_active, 
            b.created_at, b.updated_at,
            COUNT(c.id) as counter_count,
            COUNT(CASE WHEN cs.is_active = true THEN 1 END) as active_counters
     FROM branches b
     LEFT JOIN counters c ON b.id = c.branch_id
     LEFT JOIN counter_sessions cs ON c.id = cs.counter_id AND cs.end_time IS NULL
     WHERE b.id = $1 AND b.is_active = true
     GROUP BY b.id, b.name, b.address, b.phone, b.is_active, b.created_at, b.updated_at`,
    [id]
  );

  if (branchResult.rows.length === 0) {
    throw new AppError('Branch not found', 404);
  }

  const branch = branchResult.rows[0];

  res.status(200).json({
    success: true,
    data: {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.is_active,
      counterCount: parseInt(branch.counter_count),
      activeCounters: parseInt(branch.active_counters),
      createdAt: branch.created_at,
      updatedAt: branch.updated_at
    }
  });
}));

/**
 * POST /api/branches
 * Create new branch (admin only)
 */
router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { name, address, phone } = req.body;

  // Validate input
  if (!name || !address) {
    throw new AppError('Name and address are required', 400);
  }

  // Check if branch name already exists
  const existingBranchResult = await query(
    'SELECT id FROM branches WHERE name = $1',
    [name]
  );

  if (existingBranchResult.rows.length > 0) {
    throw new AppError('Branch name already exists', 409);
  }

  // Create branch
  const branchResult = await query(
    `INSERT INTO branches (name, address, phone, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING id, name, address, phone, is_active, created_at`,
    [name, address, phone || null]
  );

  const newBranch = branchResult.rows[0];

  res.status(201).json({
    success: true,
    message: 'Branch created successfully',
    data: {
      id: newBranch.id,
      name: newBranch.name,
      address: newBranch.address,
      phone: newBranch.phone,
      isActive: newBranch.is_active,
      createdAt: newBranch.created_at
    }
  });
}));

/**
 * PUT /api/branches/:id
 * Update branch (admin only)
 */
router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, address, phone, isActive } = req.body;

  // Check if branch exists
  const existingBranchResult = await query(
    'SELECT id, name FROM branches WHERE id = $1',
    [id]
  );

  if (existingBranchResult.rows.length === 0) {
    throw new AppError('Branch not found', 404);
  }

  const existingBranch = existingBranchResult.rows[0];

  // Check if new name already exists (if name is being changed)
  if (name && name !== existingBranch.name) {
    const duplicateResult = await query(
      'SELECT id FROM branches WHERE name = $1 AND id != $2',
      [name, id]
    );

    if (duplicateResult.rows.length > 0) {
      throw new AppError('Branch name already exists', 409);
    }
  }

  // Update branch
  const updateResult = await query(
    `UPDATE branches 
     SET name = COALESCE($1, name),
         address = COALESCE($2, address),
         phone = COALESCE($3, phone),
         is_active = COALESCE($4, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING id, name, address, phone, is_active, updated_at`,
    [name, address, phone, isActive, id]
  );

  const updatedBranch = updateResult.rows[0];

  res.status(200).json({
    success: true,
    message: 'Branch updated successfully',
    data: {
      id: updatedBranch.id,
      name: updatedBranch.name,
      address: updatedBranch.address,
      phone: updatedBranch.phone,
      isActive: updatedBranch.is_active,
      updatedAt: updatedBranch.updated_at
    }
  });
}));

/**
 * DELETE /api/branches/:id
 * Delete branch (admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if branch exists
  const branchResult = await query(
    'SELECT id, name FROM branches WHERE id = $1',
    [id]
  );

  if (branchResult.rows.length === 0) {
    throw new AppError('Branch not found', 404);
  }

  // Check if branch has active users
  const activeUsersResult = await query(
    'SELECT COUNT(*) as user_count FROM users WHERE branch_id = $1 AND is_active = true',
    [id]
  );

  if (parseInt(activeUsersResult.rows[0].user_count) > 0) {
    throw new AppError('Cannot delete branch with active users', 400);
  }

  // Check if branch has active queue items
  const activeQueueResult = await query(
    'SELECT COUNT(*) as queue_count FROM queue WHERE branch_id = $1 AND status IN ($2, $3)',
    [id, 'waiting', 'called']
  );

  if (parseInt(activeQueueResult.rows[0].queue_count) > 0) {
    throw new AppError('Cannot delete branch with active queue items', 400);
  }

  // Soft delete by deactivating the branch
  await query(
    'UPDATE branches SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  res.status(200).json({
    success: true,
    message: 'Branch deactivated successfully'
  });
}));

/**
 * GET /api/branches/:id/counters
 * Get all counters for a branch
 */
router.get('/:id/counters', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify branch exists and user has access
  const branchResult = await query(
    'SELECT id, name FROM branches WHERE id = $1 AND is_active = true',
    [id]
  );

  if (branchResult.rows.length === 0) {
    throw new AppError('Branch not found', 404);
  }

  // Check branch access for non-admin users
  if (req.user.role !== 'admin' && req.user.branch_id !== parseInt(id)) {
    throw new AppError('Access denied to this branch', 403);
  }

  // Get counters with session information
  const countersResult = await query(
    `SELECT c.id, c.number, c.is_active,
            cs.id as session_id, cs.user_id, cs.start_time,
            u.username as clerk_username
     FROM counters c
     LEFT JOIN counter_sessions cs ON c.id = cs.counter_id AND cs.end_time IS NULL
     LEFT JOIN users u ON cs.user_id = u.id
     WHERE c.branch_id = $1
     ORDER BY c.number ASC`,
    [id]
  );

  res.status(200).json({
    success: true,
    data: countersResult.rows.map(counter => ({
      id: counter.id,
      number: counter.number,
      isActive: counter.is_active,
      session: counter.session_id ? {
        id: counter.session_id,
        userId: counter.user_id,
        clerkUsername: counter.clerk_username,
        startTime: counter.start_time
      } : null
    }))
  });
}));

/**
 * GET /api/branches/:id/stats
 * Get branch statistics
 */
router.get('/:id/stats', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify branch exists and user has access
  const branchResult = await query(
    'SELECT id, name FROM branches WHERE id = $1 AND is_active = true',
    [id]
  );

  if (branchResult.rows.length === 0) {
    throw new AppError('Branch not found', 404);
  }

  // Check branch access for non-admin users
  if (req.user.role !== 'admin' && req.user.branch_id !== parseInt(id)) {
    throw new AppError('Access denied to this branch', 403);
  }

  // Get today's statistics
  const today = new Date().toISOString().split('T')[0];

  const statsResult = await query(
    `SELECT 
       COUNT(CASE WHEN q.status = 'waiting' THEN 1 END) as waiting_count,
       COUNT(CASE WHEN q.status = 'called' THEN 1 END) as called_count,
       COUNT(CASE WHEN q.status = 'completed' AND DATE(q.completed_at) = $2 THEN 1 END) as completed_today,
       COUNT(CASE WHEN q.status = 'completed' THEN 1 END) as total_completed,
       AVG(CASE WHEN q.status = 'completed' AND q.service_duration IS NOT NULL 
                THEN q.service_duration END) as avg_service_time,
       COUNT(DISTINCT cs.id) as active_counters,
       COUNT(DISTINCT c.id) as total_counters
     FROM queue q
     RIGHT JOIN counters c ON q.counter_id = c.id
     LEFT JOIN counter_sessions cs ON c.id = cs.counter_id AND cs.end_time IS NULL
     WHERE c.branch_id = $1`,
    [id, today]
  );

  const stats = statsResult.rows[0];

  res.status(200).json({
    success: true,
    data: {
      waitingCount: parseInt(stats.waiting_count) || 0,
      calledCount: parseInt(stats.called_count) || 0,
      completedToday: parseInt(stats.completed_today) || 0,
      totalCompleted: parseInt(stats.total_completed) || 0,
      avgServiceTime: stats.avg_service_time ? Math.round(parseFloat(stats.avg_service_time)) : 0,
      activeCounters: parseInt(stats.active_counters) || 0,
      totalCounters: parseInt(stats.total_counters) || 0
    }
  });
}));

export default router;