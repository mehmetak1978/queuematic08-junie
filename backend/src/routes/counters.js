/**
 * Counter Routes
 * Handles counter management and session operations
 */

import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize, checkBranchAccess } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/counters/available/:branchId
 * Get available counters for a branch
 */
router.get('/available/:branchId', authenticate, checkBranchAccess, asyncHandler(async (req, res) => {
  const { branchId } = req.params;

  const countersResult = await query(
    `SELECT c.id, c.number, c.is_active
     FROM counters c
     LEFT JOIN counter_sessions cs ON c.id = cs.counter_id AND cs.end_time IS NULL
     WHERE c.branch_id = $1 AND c.is_active = true AND cs.id IS NULL
     ORDER BY c.number ASC`,
    [branchId]
  );

  res.status(200).json({
    success: true,
    data: countersResult.rows.map(counter => ({
      id: counter.id,
      number: counter.number,
      isActive: counter.is_active
    }))
  });
}));

/**
 * GET /api/counters/my-session
 * Get current user's active counter session
 */
router.get('/my-session', authenticate, authorize('clerk'), asyncHandler(async (req, res) => {
  const sessionResult = await query(
    `SELECT cs.id, cs.counter_id, cs.start_time,
            c.number as counter_number, c.branch_id,
            b.name as branch_name,
            q.id as current_queue_id, q.number as current_queue_number,
            q.status as current_queue_status, q.created_at as queue_created_at
     FROM counter_sessions cs
     JOIN counters c ON cs.counter_id = c.id
     JOIN branches b ON c.branch_id = b.id
     LEFT JOIN queue q ON cs.id = q.counter_session_id AND q.status IN ('called', 'serving')
     WHERE cs.user_id = $1 AND cs.end_time IS NULL`,
    [req.user.id]
  );

  if (sessionResult.rows.length === 0) {
    return res.status(200).json({
      success: true,
      data: null
    });
  }

  const session = sessionResult.rows[0];

  res.status(200).json({
    success: true,
    data: {
      sessionId: session.id,
      counterId: session.counter_id,
      counterNumber: session.counter_number,
      branchId: session.branch_id,
      branchName: session.branch_name,
      startTime: session.start_time,
      currentQueue: session.current_queue_id ? {
        id: session.current_queue_id,
        number: session.current_queue_number,
        status: session.current_queue_status,
        createdAt: session.queue_created_at
      } : null
    }
  });
}));

/**
 * GET /api/counters/last-used
 * Get current user's last used counter if available
 */
router.get('/last-used', authenticate, authorize('clerk'), asyncHandler(async (req, res) => {
  // Find user's most recent completed counter session
  const lastSessionResult = await query(
    `SELECT cs.counter_id, c.number as counter_number, c.branch_id, c.is_active,
            b.name as branch_name, cs.end_time
     FROM counter_sessions cs
     JOIN counters c ON cs.counter_id = c.id
     JOIN branches b ON c.branch_id = b.id
     WHERE cs.user_id = $1 AND cs.end_time IS NOT NULL
     ORDER BY cs.end_time DESC
     LIMIT 1`,
    [req.user.id]
  );

  if (lastSessionResult.rows.length === 0) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'No previous counter usage found'
    });
  }

  const lastSession = lastSessionResult.rows[0];

  // Check if the counter is currently available (not in use and active)
  const availabilityResult = await query(
    `SELECT c.id, c.number, c.is_active
     FROM counters c
     LEFT JOIN counter_sessions cs ON c.id = cs.counter_id AND cs.end_time IS NULL
     WHERE c.id = $1 AND c.is_active = true AND cs.id IS NULL`,
    [lastSession.counter_id]
  );

  if (availabilityResult.rows.length === 0) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'Last used counter is not currently available'
    });
  }

  const availableCounter = availabilityResult.rows[0];

  res.status(200).json({
    success: true,
    data: {
      counterId: availableCounter.id,
      counterNumber: availableCounter.number,
      branchId: lastSession.branch_id,
      branchName: lastSession.branch_name,
      lastUsed: lastSession.end_time,
      isActive: availableCounter.is_active
    },
    message: 'Last used counter is available'
  });
}));

/**
 * GET /api/counters/:branchId
 * Get all counters for a branch with their current status
 */
router.get('/:branchId', authenticate, checkBranchAccess, asyncHandler(async (req, res) => {
  const { branchId } = req.params;

  const countersResult = await query(
    `SELECT c.id, c.number, c.is_active,
            cs.id as session_id, cs.user_id, cs.start_time,
            u.username as clerk_username,
            q.id as current_queue_id, q.number as current_queue_number,
            q.status as current_queue_status
     FROM counters c
     LEFT JOIN counter_sessions cs ON c.id = cs.counter_id AND cs.end_time IS NULL
     LEFT JOIN users u ON cs.user_id = u.id
     LEFT JOIN queue q ON cs.id = q.counter_session_id AND q.status IN ('called', 'serving')
     WHERE c.branch_id = $1
     ORDER BY c.number ASC`,
    [branchId]
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
        startTime: counter.start_time,
        currentQueue: counter.current_queue_id ? {
          id: counter.current_queue_id,
          number: counter.current_queue_number,
          status: counter.current_queue_status
        } : null
      } : null
    }))
  });
}));

/**
 * POST /api/counters/start-session
 * Start a counter session
 */
router.post('/start-session', authenticate, authorize('clerk'), asyncHandler(async (req, res) => {
  const { counterId } = req.body;

  if (!counterId) {
    throw new AppError('Counter ID is required', 400);
  }

  // Check if counter exists and is available
  const counterResult = await query(
    `SELECT c.id, c.number, c.branch_id, c.is_active
     FROM counters c
     LEFT JOIN counter_sessions cs ON c.id = cs.counter_id AND cs.end_time IS NULL
     WHERE c.id = $1`,
    [counterId]
  );

  if (counterResult.rows.length === 0) {
    throw new AppError('Counter not found', 404);
  }

  const counter = counterResult.rows[0];

  if (!counter.is_active) {
    throw new AppError('Counter is not active', 400);
  }

  // Check if user has access to this branch
  if (req.user.role !== 'admin' && req.user.branch_id !== counter.branch_id) {
    throw new AppError('Access denied to this branch', 403);
  }

  // Check if counter is already in use
  const activeSessionResult = await query(
    'SELECT id FROM counter_sessions WHERE counter_id = $1 AND end_time IS NULL',
    [counterId]
  );

  if (activeSessionResult.rows.length > 0) {
    throw new AppError('Counter is already in use', 409);
  }

  // Check if user already has an active session
  const userActiveSessionResult = await query(
    'SELECT id, counter_id FROM counter_sessions WHERE user_id = $1 AND end_time IS NULL',
    [req.user.id]
  );

  if (userActiveSessionResult.rows.length > 0) {
    throw new AppError('User already has an active counter session', 409);
  }

  // Start new session
  const sessionResult = await query(
    `INSERT INTO counter_sessions (counter_id, user_id, start_time)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     RETURNING id, counter_id, user_id, start_time`,
    [counterId, req.user.id]
  );

  const newSession = sessionResult.rows[0];

  res.status(201).json({
    success: true,
    message: 'Counter session started successfully',
    data: {
      sessionId: newSession.id,
      counterId: newSession.counter_id,
      counterNumber: counter.number,
      userId: newSession.user_id,
      startTime: newSession.start_time
    }
  });
}));

/**
 * POST /api/counters/end-session
 * End a counter session
 */
router.post('/end-session', authenticate, authorize('clerk'), asyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    throw new AppError('Session ID is required', 400);
  }

  // Get session details
  const sessionResult = await query(
    `SELECT cs.id, cs.counter_id, cs.user_id, cs.start_time,
            c.number as counter_number, c.branch_id
     FROM counter_sessions cs
     JOIN counters c ON cs.counter_id = c.id
     WHERE cs.id = $1 AND cs.end_time IS NULL`,
    [sessionId]
  );

  if (sessionResult.rows.length === 0) {
    throw new AppError('Active session not found', 404);
  }

  const session = sessionResult.rows[0];

  // Check if user owns this session or is admin
  if (req.user.role !== 'admin' && req.user.id !== session.user_id) {
    throw new AppError('Access denied to this session', 403);
  }

  // Check if there are any active queue items for this session
  const activeQueueResult = await query(
    'SELECT id FROM queue WHERE counter_session_id = $1 AND status IN ($2, $3)',
    [sessionId, 'called', 'serving']
  );

  if (activeQueueResult.rows.length > 0) {
    throw new AppError('Cannot end session with active queue items. Complete or cancel current service first.', 400);
  }

  // End the session
  await query(
    'UPDATE counter_sessions SET end_time = CURRENT_TIMESTAMP WHERE id = $1',
    [sessionId]
  );

  res.status(200).json({
    success: true,
    message: 'Counter session ended successfully'
  });
}));

/**
 * POST /api/counters
 * Create new counter (admin only)
 */
router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { branchId, number } = req.body;

  if (!branchId || !number) {
    throw new AppError('Branch ID and counter number are required', 400);
  }

  // Check if branch exists
  const branchResult = await query(
    'SELECT id FROM branches WHERE id = $1 AND is_active = true',
    [branchId]
  );

  if (branchResult.rows.length === 0) {
    throw new AppError('Branch not found', 404);
  }

  // Check if counter number already exists in this branch
  const existingCounterResult = await query(
    'SELECT id FROM counters WHERE branch_id = $1 AND number = $2',
    [branchId, number]
  );

  if (existingCounterResult.rows.length > 0) {
    throw new AppError('Counter number already exists in this branch', 409);
  }

  // Create counter
  const counterResult = await query(
    `INSERT INTO counters (branch_id, number, is_active)
     VALUES ($1, $2, true)
     RETURNING id, branch_id, number, is_active, created_at`,
    [branchId, number]
  );

  const newCounter = counterResult.rows[0];

  res.status(201).json({
    success: true,
    message: 'Counter created successfully',
    data: {
      id: newCounter.id,
      branchId: newCounter.branch_id,
      number: newCounter.number,
      isActive: newCounter.is_active,
      createdAt: newCounter.created_at
    }
  });
}));

/**
 * PUT /api/counters/:id
 * Update counter (admin only)
 */
router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { number, isActive } = req.body;

  // Check if counter exists
  const existingCounterResult = await query(
    'SELECT id, branch_id, number FROM counters WHERE id = $1',
    [id]
  );

  if (existingCounterResult.rows.length === 0) {
    throw new AppError('Counter not found', 404);
  }

  const existingCounter = existingCounterResult.rows[0];

  // Check if new number already exists in this branch (if number is being changed)
  if (number && number !== existingCounter.number) {
    const duplicateResult = await query(
      'SELECT id FROM counters WHERE branch_id = $1 AND number = $2 AND id != $3',
      [existingCounter.branch_id, number, id]
    );

    if (duplicateResult.rows.length > 0) {
      throw new AppError('Counter number already exists in this branch', 409);
    }
  }

  // If deactivating counter, check for active sessions
  if (isActive === false) {
    const activeSessionResult = await query(
      'SELECT id FROM counter_sessions WHERE counter_id = $1 AND end_time IS NULL',
      [id]
    );

    if (activeSessionResult.rows.length > 0) {
      throw new AppError('Cannot deactivate counter with active session', 400);
    }
  }

  // Update counter
  const updateResult = await query(
    `UPDATE counters 
     SET number = COALESCE($1, number),
         is_active = COALESCE($2, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING id, branch_id, number, is_active, updated_at`,
    [number, isActive, id]
  );

  const updatedCounter = updateResult.rows[0];

  res.status(200).json({
    success: true,
    message: 'Counter updated successfully',
    data: {
      id: updatedCounter.id,
      branchId: updatedCounter.branch_id,
      number: updatedCounter.number,
      isActive: updatedCounter.is_active,
      updatedAt: updatedCounter.updated_at
    }
  });
}));

/**
 * DELETE /api/counters/:id
 * Delete counter (admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if counter exists
  const counterResult = await query(
    'SELECT id FROM counters WHERE id = $1',
    [id]
  );

  if (counterResult.rows.length === 0) {
    throw new AppError('Counter not found', 404);
  }

  // Check for active sessions
  const activeSessionResult = await query(
    'SELECT id FROM counter_sessions WHERE counter_id = $1 AND end_time IS NULL',
    [id]
  );

  if (activeSessionResult.rows.length > 0) {
    throw new AppError('Cannot delete counter with active session', 400);
  }

  // Check for queue history
  const queueHistoryResult = await query(
    'SELECT COUNT(*) as queue_count FROM queue WHERE counter_id = $1',
    [id]
  );

  if (parseInt(queueHistoryResult.rows[0].queue_count) > 0) {
    // Soft delete by deactivating
    await query(
      'UPDATE counters SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Counter deactivated successfully (has queue history)'
    });
  } else {
    // Hard delete if no history
    await query('DELETE FROM counters WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Counter deleted successfully'
    });
  }
}));

export default router;