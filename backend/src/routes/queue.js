/**
 * Queue Routes
 * Handles queue management operations
 */

import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * POST /api/queue/next-number
 * Get next queue number for a branch
 */
router.post('/next-number', asyncHandler(async (req, res) => {
  const { branchId } = req.body;

  if (!branchId) {
    throw new AppError('Branch ID is required', 400);
  }

  // Verify branch exists
  const branchResult = await query(
    'SELECT id, name FROM branches WHERE id = $1 AND is_active = true',
    [branchId]
  );

  if (branchResult.rows.length === 0) {
    throw new AppError('Branch not found', 404);
  }

  const branch = branchResult.rows[0];

  // Get next queue number for today
  const today = new Date().toISOString().split('T')[0];
  
  const nextNumberResult = await query(
    `SELECT COALESCE(MAX(number), 0) + 1 as next_number
     FROM queue 
     WHERE branch_id = $1 AND DATE(created_at) = $2`,
    [branchId, today]
  );

  const nextNumber = nextNumberResult.rows[0].next_number;

  // Create queue entry
  const queueResult = await query(
    `INSERT INTO queue (branch_id, number, status, created_at)
     VALUES ($1, $2, 'waiting', CURRENT_TIMESTAMP)
     RETURNING id, branch_id, number, status, created_at`,
    [branchId, nextNumber]
  );

  const newQueue = queueResult.rows[0];

  res.status(201).json({
    success: true,
    message: 'Queue number generated successfully',
    data: {
      id: newQueue.id,
      branchId: newQueue.branch_id,
      branchName: branch.name,
      number: newQueue.number,
      status: newQueue.status,
      createdAt: newQueue.created_at
    }
  });
}));

/**
 * POST /api/queue/call-next
 * Call next customer
 */
router.post('/call-next', authenticate, authorize('clerk'), asyncHandler(async (req, res) => {
  const { counterId } = req.body;

  if (!counterId) {
    throw new AppError('Counter ID is required', 400);
  }

  // Get counter and session information
  const counterResult = await query(
    `SELECT c.id, c.number, c.branch_id,
            cs.id as session_id, cs.user_id
     FROM counters c
     JOIN counter_sessions cs ON c.id = cs.counter_id AND cs.end_time IS NULL
     WHERE c.id = $1`,
    [counterId]
  );

  if (counterResult.rows.length === 0) {
    throw new AppError('Counter not found or no active session', 404);
  }

  const counter = counterResult.rows[0];

  // Check if user owns this session
  if (req.user.id !== counter.user_id) {
    throw new AppError('Access denied to this counter session', 403);
  }

  // Check if counter already has an active queue item
  const activeQueueResult = await query(
    'SELECT id FROM queue WHERE counter_session_id = $1 AND status IN ($2, $3)',
    [counter.session_id, 'called', 'serving']
  );

  if (activeQueueResult.rows.length > 0) {
    throw new AppError('Counter already has an active queue item. Complete current service first.', 409);
  }

  // Get next waiting customer
  const nextCustomerResult = await query(
    `SELECT id, number, created_at
     FROM queue 
     WHERE branch_id = $1 AND status = 'waiting'
     ORDER BY created_at ASC
     LIMIT 1`,
    [counter.branch_id]
  );

  if (nextCustomerResult.rows.length === 0) {
    throw new AppError('No customers waiting in queue', 404);
  }

  const nextCustomer = nextCustomerResult.rows[0];

  // Call the customer
  const updateResult = await query(
    `UPDATE queue 
     SET status = 'called',
         counter_id = $1,
         counter_session_id = $2,
         called_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING id, branch_id, number, status, created_at, called_at`,
    [counterId, counter.session_id, nextCustomer.id]
  );

  const calledQueue = updateResult.rows[0];

  res.status(200).json({
    success: true,
    message: 'Customer called successfully',
    data: {
      id: calledQueue.id,
      branchId: calledQueue.branch_id,
      number: calledQueue.number,
      status: calledQueue.status,
      counterId: counterId,
      counterNumber: counter.number,
      createdAt: calledQueue.created_at,
      calledAt: calledQueue.called_at
    }
  });
}));

/**
 * POST /api/queue/complete
 * Complete current service
 */
router.post('/complete', authenticate, authorize('clerk'), asyncHandler(async (req, res) => {
  const { queueId } = req.body;

  if (!queueId) {
    throw new AppError('Queue ID is required', 400);
  }

  // Get queue item with session information
  const queueResult = await query(
    `SELECT q.id, q.number, q.status, q.called_at, q.counter_session_id,
            cs.user_id, c.number as counter_number
     FROM queue q
     JOIN counter_sessions cs ON q.counter_session_id = cs.id
     JOIN counters c ON cs.counter_id = c.id
     WHERE q.id = $1`,
    [queueId]
  );

  if (queueResult.rows.length === 0) {
    throw new AppError('Queue item not found', 404);
  }

  const queueItem = queueResult.rows[0];

  // Check if user owns this session
  if (req.user.id !== queueItem.user_id) {
    throw new AppError('Access denied to this queue item', 403);
  }

  // Check if queue item can be completed
  if (!['called', 'serving'].includes(queueItem.status)) {
    throw new AppError('Queue item cannot be completed in current status', 400);
  }

  // Calculate service duration
  const serviceDuration = queueItem.called_at ? 
    Math.round((new Date() - new Date(queueItem.called_at)) / 1000) : null;

  // Complete the service
  const updateResult = await query(
    `UPDATE queue 
     SET status = 'completed',
         completed_at = CURRENT_TIMESTAMP,
         service_duration = $1
     WHERE id = $2
     RETURNING id, number, status, completed_at, service_duration`,
    [serviceDuration, queueId]
  );

  const completedQueue = updateResult.rows[0];

  res.status(200).json({
    success: true,
    message: 'Service completed successfully',
    data: {
      id: completedQueue.id,
      number: completedQueue.number,
      status: completedQueue.status,
      counterNumber: queueItem.counter_number,
      completedAt: completedQueue.completed_at,
      serviceDuration: completedQueue.service_duration
    }
  });
}));

/**
 * GET /api/queue/status/:branchId
 * Get queue status for a branch
 */
router.get('/status/:branchId', optionalAuth, asyncHandler(async (req, res) => {
  const { branchId } = req.params;

  // Verify branch exists
  const branchResult = await query(
    'SELECT id, name FROM branches WHERE id = $1 AND is_active = true',
    [branchId]
  );

  if (branchResult.rows.length === 0) {
    throw new AppError('Branch not found', 404);
  }

  const today = new Date().toISOString().split('T')[0];

  // Get queue statistics
  const statsResult = await query(
    `SELECT 
       COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_count,
       COUNT(CASE WHEN status = 'called' THEN 1 END) as called_count,
       COUNT(CASE WHEN status = 'serving' THEN 1 END) as serving_count,
       COUNT(CASE WHEN status = 'completed' AND DATE(completed_at) = $2 THEN 1 END) as completed_today,
       MAX(CASE WHEN status = 'completed' THEN number END) as last_completed_number,
       MAX(CASE WHEN status IN ('called', 'serving') THEN number END) as current_serving_number,
       AVG(CASE WHEN status = 'completed' AND service_duration IS NOT NULL 
                THEN service_duration END) as avg_service_time
     FROM queue 
     WHERE branch_id = $1 AND DATE(created_at) = $2`,
    [branchId, today]
  );

  const stats = statsResult.rows[0];

  // Get recent completed numbers (last 5)
  const recentCompletedResult = await query(
    `SELECT number, completed_at
     FROM queue 
     WHERE branch_id = $1 AND status = 'completed' AND DATE(completed_at) = $2
     ORDER BY completed_at DESC
     LIMIT 5`,
    [branchId, today]
  );

  // Estimate waiting time based on average service time and queue length
  const avgServiceTime = stats.avg_service_time ? Math.round(parseFloat(stats.avg_service_time)) : 180; // Default 3 minutes
  const waitingCount = parseInt(stats.waiting_count) || 0;
  const estimatedWaitTime = waitingCount * avgServiceTime;

  // Get active counters count
  const activeCountersResult = await query(
    `SELECT COUNT(DISTINCT cs.id) as active_counters
     FROM counters c
     LEFT JOIN counter_sessions cs ON c.id = cs.counter_id AND cs.end_time IS NULL
     WHERE c.branch_id = $1`,
    [branchId]
  );

  const activeCounters = parseInt(activeCountersResult.rows[0].active_counters) || 0;

  // Get last called queue information
  const lastCalledResult = await query(
    `SELECT q.id, q.branch_id, q.number, q.status, q.created_at, q.called_at,
            c.id as counter_id, c.number as counter_number
     FROM queue q
     LEFT JOIN counters c ON q.counter_id = c.id
     WHERE q.branch_id = $1 AND q.status IN ('called', 'serving')
     ORDER BY q.called_at DESC
     LIMIT 1`,
    [branchId]
  );

  const lastCalled = lastCalledResult.rows.length > 0 ? {
    id: lastCalledResult.rows[0].id,
    branchId: lastCalledResult.rows[0].branch_id,
    number: lastCalledResult.rows[0].number,
    status: lastCalledResult.rows[0].status,
    createdAt: lastCalledResult.rows[0].created_at,
    calledAt: lastCalledResult.rows[0].called_at,
    counterId: lastCalledResult.rows[0].counter_id,
    counterNumber: lastCalledResult.rows[0].counter_number
  } : null;

  res.status(200).json({
    success: true,
    data: {
      branchId: parseInt(branchId),
      branchName: branchResult.rows[0].name,
      waitingCount: waitingCount,
      calledCount: parseInt(stats.called_count) || 0,
      servingCount: parseInt(stats.serving_count) || 0,
      completedToday: parseInt(stats.completed_today) || 0,
      lastCompletedNumber: stats.last_completed_number || 0,
      currentServingNumber: stats.current_serving_number || 0,
      avgServiceTime: avgServiceTime,
      estimatedWaitTime: estimatedWaitTime,
      activeCounters: activeCounters,
      canTakeNumber: true, // Always allow taking queue numbers regardless of active counters
      lastCalled: lastCalled,
      recentCompleted: recentCompletedResult.rows.map(item => ({
        number: item.number,
        completedAt: item.completed_at
      }))
    }
  });
}));

/**
 * GET /api/queue/display/:branchId
 * Get display data for a branch (for display panel)
 */
router.get('/display/:branchId', optionalAuth, asyncHandler(async (req, res) => {
  const { branchId } = req.params;

  // Verify branch exists
  const branchResult = await query(
    'SELECT id, name FROM branches WHERE id = $1 AND is_active = true',
    [branchId]
  );

  if (branchResult.rows.length === 0) {
    throw new AppError('Branch not found', 404);
  }

  const today = new Date().toISOString().split('T')[0];

  // Get currently serving customers
  const currentlyServingResult = await query(
    `SELECT q.number as queue_number, c.number as counter_number,
            q.called_at, q.status
     FROM queue q
     JOIN counters c ON q.counter_id = c.id
     WHERE q.branch_id = $1 AND q.status IN ('called', 'serving')
     ORDER BY q.called_at ASC`,
    [branchId]
  );

  // Get waiting queue numbers
  const waitingQueueResult = await query(
    `SELECT id, number, created_at
     FROM queue 
     WHERE branch_id = $1 AND status = 'waiting' AND DATE(created_at) = $2
     ORDER BY created_at ASC
     LIMIT 10`,
    [branchId, today]
  );

  // Get last called number
  const lastCalledResult = await query(
    `SELECT q.number, c.number as counter_number, called_at
     FROM queue q
     JOIN counters c ON q.counter_id = c.id
     WHERE q.branch_id = $1 AND q.status IN ('called', 'serving', 'completed') 
           AND DATE(q.created_at) = $2
     ORDER BY q.called_at DESC
     LIMIT 1`,
    [branchId, today]
  );

  // Get recent completed numbers (last 3)
  const recentCompletedResult = await query(
    `SELECT q.number, c.number as counter_number, q.completed_at
     FROM queue q
     JOIN counters c ON q.counter_id = c.id
     WHERE q.branch_id = $1 AND q.status = 'completed' AND DATE(q.completed_at) = $2
     ORDER BY q.completed_at DESC
     LIMIT 3`,
    [branchId, today]
  );

  // Get active counters count
  const activeCountersResult = await query(
    `SELECT COUNT(DISTINCT cs.counter_id) as active_count
     FROM counter_sessions cs
     JOIN counters c ON cs.counter_id = c.id
     WHERE c.branch_id = $1 AND cs.end_time IS NULL`,
    [branchId]
  );

  // Get completed today count
  const completedTodayResult = await query(
    `SELECT COUNT(*) as completed_count
     FROM queue
     WHERE branch_id = $1 AND status = 'completed' AND DATE(completed_at) = $2`,
    [branchId, today]
  );

  res.status(200).json({
    success: true,
    data: {
      branchId: parseInt(branchId),
      branchName: branchResult.rows[0].name,
      currentlyServing: currentlyServingResult.rows.map(item => ({
        id: `serving-${item.queue_number}`,
        queueNumber: item.queue_number,
        counterNumber: item.counter_number,
        calledAt: item.called_at,
        status: item.status
      })),
      waitingQueue: waitingQueueResult.rows.map(item => ({
        id: item.id,
        queueNumber: item.number,
        createdAt: item.created_at,
        status: 'waiting'
      })),
      lastCalled: lastCalledResult.rows.length > 0 ? {
        id: `last-${lastCalledResult.rows[0].number}`,
        queueNumber: lastCalledResult.rows[0].number,
        counterNumber: lastCalledResult.rows[0].counter_number,
        calledAt: lastCalledResult.rows[0].called_at
      } : null,
      recentCompleted: recentCompletedResult.rows.map(item => ({
        queueNumber: item.number,
        counterNumber: item.counter_number,
        completedAt: item.completed_at
      })),
      activeCounters: parseInt(activeCountersResult.rows[0].active_count) || 0,
      completedToday: parseInt(completedTodayResult.rows[0].completed_count) || 0,
      timestamp: new Date().toISOString()
    }
  });
}));

/**
 * GET /api/queue/history/:userId
 * Get work history for a clerk
 */
router.get('/history/:userId', authenticate, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if user can access this history
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    throw new AppError('Access denied to this user history', 403);
  }

  const today = new Date().toISOString().split('T')[0];

  // Get today's completed work
  const historyResult = await query(
    `SELECT q.id, q.number, q.status, q.created_at, q.called_at, q.completed_at,
            q.service_duration, c.number as counter_number,
            b.name as branch_name
     FROM queue q
     JOIN counter_sessions cs ON q.counter_session_id = cs.id
     JOIN counters c ON cs.counter_id = c.id
     JOIN branches b ON c.branch_id = b.id
     WHERE cs.user_id = $1 AND DATE(q.completed_at) = $2
     ORDER BY q.completed_at DESC`,
    [userId, today]
  );

  // Get session statistics
  const statsResult = await query(
    `SELECT 
       COUNT(*) as total_completed,
       AVG(service_duration) as avg_service_time,
       SUM(service_duration) as total_service_time,
       MIN(completed_at) as first_completion,
       MAX(completed_at) as last_completion
     FROM queue q
     JOIN counter_sessions cs ON q.counter_session_id = cs.id
     WHERE cs.user_id = $1 AND DATE(q.completed_at) = $2 AND q.status = 'completed'`,
    [userId, today]
  );

  const stats = statsResult.rows[0];

  res.status(200).json({
    success: true,
    data: {
      userId: parseInt(userId),
      date: today,
      statistics: {
        totalCompleted: parseInt(stats.total_completed) || 0,
        avgServiceTime: stats.avg_service_time ? Math.round(parseFloat(stats.avg_service_time)) : 0,
        totalServiceTime: parseInt(stats.total_service_time) || 0,
        firstCompletion: stats.first_completion,
        lastCompletion: stats.last_completion
      },
      history: historyResult.rows.map(item => ({
        id: item.id,
        queueNumber: item.number,
        status: item.status,
        counterNumber: item.counter_number,
        branchName: item.branch_name,
        createdAt: item.created_at,
        calledAt: item.called_at,
        completedAt: item.completed_at,
        serviceDuration: item.service_duration
      }))
    }
  });
}));

/**
 * DELETE /api/queue/:id
 * Cancel/remove queue item (admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get queue item
  const queueResult = await query(
    'SELECT id, number, status, branch_id FROM queue WHERE id = $1',
    [id]
  );

  if (queueResult.rows.length === 0) {
    throw new AppError('Queue item not found', 404);
  }

  const queueItem = queueResult.rows[0];

  // Only allow cancellation of waiting items
  if (queueItem.status !== 'waiting') {
    throw new AppError('Can only cancel waiting queue items', 400);
  }

  // Remove the queue item
  await query('DELETE FROM queue WHERE id = $1', [id]);

  res.status(200).json({
    success: true,
    message: 'Queue item cancelled successfully'
  });
}));

export default router;