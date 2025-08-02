/**
 * Database Service
 * Handles all database operations for the frontend
 * Uses API calls to communicate with backend
 */

import axios from 'axios';
import AppConfig from '../config/AppConfig.js';
import Logger from '../utils/Logger.js';

class DatabaseService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3008/api';
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        Logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
        return config;
      },
      (error) => {
        Logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        Logger.debug(`API Response: ${response.status} ${response.config.url}`, response.data);
        return response;
      },
      (error) => {
        Logger.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - Axios error object
   * @param {string} operation - Operation description
   * @throws {Error} Formatted error
   */
  handleError(error, operation) {
    const message = error.response?.data?.message || error.message || 'Unknown error';
    const statusCode = error.response?.status || 500;
    
    Logger.error(`${operation} failed:`, { message, statusCode });
    
    const formattedError = new Error(`${operation} failed: ${message}`);
    formattedError.statusCode = statusCode;
    throw formattedError;
  }

  // ==================== AUTH OPERATIONS ====================

  /**
   * Authenticate user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} User data with token
   */
  async login(username, password) {
    try {
      const response = await this.axiosInstance.post('/auth/login', {
        username,
        password
      });
      
      Logger.info(`User ${username} logged in successfully`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Login');
    }
  }

  /**
   * Logout user
   * @param {string} token - Auth token
   * @returns {Promise<void>}
   */
  async logout(token) {
    try {
      await this.axiosInstance.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Logger.info('User logged out successfully');
    } catch (error) {
      this.handleError(error, 'Logout');
    }
  }

  // ==================== USER OPERATIONS ====================

  /**
   * Get all users (admin only)
   * @param {string} token - Auth token
   * @returns {Promise<Array>} List of users
   */
  async getUsers(token) {
    try {
      const response = await this.axiosInstance.get('/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      this.handleError(error, 'Get users');
    }
  }

  /**
   * Create new user (admin only)
   * @param {Object} userData - User data
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData, token) {
    try {
      const response = await this.axiosInstance.post('/users', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Logger.info(`User ${userData.username} created successfully`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Create user');
    }
  }

  // ==================== BRANCH OPERATIONS ====================

  /**
   * Get all branches
   * @param {string} token - Auth token
   * @returns {Promise<Array>} List of branches
   */
  async getBranches(token) {
    try {
      const response = await this.axiosInstance.get('/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      this.handleError(error, 'Get branches');
    }
  }

  // ==================== COUNTER OPERATIONS ====================

  /**
   * Get available counters for a branch
   * @param {number} branchId - Branch ID
   * @param {string} token - Auth token
   * @returns {Promise<Array>} List of available counters
   */
  async getAvailableCounters(branchId, token) {
    try {
      const response = await this.axiosInstance.get(`/counters/available/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Backend returns {success: true, data: [...]} format
      const counters = response.data?.data || response.data;
      return Array.isArray(counters) ? counters : [];
    } catch (error) {
      // Log the error but don't throw it, return empty array instead
      const message = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 500;
      Logger.error(`Get available counters failed:`, { message, statusCode });
      return []; // Return empty array on error to prevent map() failures
    }
  }

  /**
   * Start counter session
   * @param {number} counterId - Counter ID
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Counter session data
   */
  async startCounterSession(counterId, token) {
    try {
      const response = await this.axiosInstance.post('/counters/start-session', {
        counterId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Logger.info(`Counter session started for counter ${counterId}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Start counter session');
    }
  }

  /**
   * End counter session
   * @param {number} sessionId - Session ID
   * @param {string} token - Auth token
   * @returns {Promise<void>}
   */
  async endCounterSession(sessionId, token) {
    try {
      await this.axiosInstance.post('/counters/end-session', {
        sessionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Logger.info(`Counter session ${sessionId} ended`);
    } catch (error) {
      this.handleError(error, 'End counter session');
    }
  }

  /**
   * Get current user's active counter session
   * @param {string} token - Auth token
   * @returns {Promise<Object|null>} Active session data or null if no active session
   */
  async getCurrentUserSession(token) {
    try {
      const response = await this.axiosInstance.get('/counters/my-session', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const sessionData = response.data?.data;
      Logger.info('Current user session retrieved:', sessionData);
      return sessionData;
    } catch (error) {
      // If no active session, return null instead of throwing error
      if (error.response?.status === 404 || !error.response?.data?.data) {
        Logger.debug('No active session found for current user');
        return null;
      }
      this.handleError(error, 'Get current user session');
    }
  }

  /**
   * Get current user's last used counter if available
   * @param {string} token - Auth token
   * @returns {Promise<Object|null>} Last used counter data or null if not available
   */
  async getLastUsedCounter(token) {
    try {
      const response = await this.axiosInstance.get('/counters/last-used', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const counterData = response.data?.data;
      Logger.info('Last used counter retrieved:', counterData);
      return counterData;
    } catch (error) {
      // If no last used counter or not available, return null instead of throwing error
      if (error.response?.status === 404 || !error.response?.data?.data) {
        Logger.debug('No available last used counter found for current user');
        return null;
      }
      this.handleError(error, 'Get last used counter');
    }
  }

  // ==================== QUEUE OPERATIONS ====================

  /**
   * Get next queue number for a branch
   * @param {number} branchId - Branch ID
   * @returns {Promise<Object>} Queue number data
   */
  async getNextQueueNumber(branchId) {
    try {
      const response = await this.axiosInstance.post('/queue/next-number', {
        branchId
      });
      
      Logger.info(`New queue number generated for branch ${branchId}:`, response.data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Get next queue number');
    }
  }

  /**
   * Call next customer
   * @param {number} counterId - Counter ID
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Called queue data
   */
  async callNextCustomer(counterId, token) {
    try {
      const response = await this.axiosInstance.post('/queue/call-next', {
        counterId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Logger.info(`Next customer called for counter ${counterId}:`, response.data);
      return response.data.data; // Return the actual queue data, not the wrapper
    } catch (error) {
      this.handleError(error, 'Call next customer');
    }
  }

  /**
   * Complete current service
   * @param {number} queueId - Queue ID
   * @param {string} token - Auth token
   * @returns {Promise<void>}
   */
  async completeService(queueId, token) {
    try {
      await this.axiosInstance.post('/queue/complete', {
        queueId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Logger.info(`Service completed for queue ${queueId}`);
    } catch (error) {
      this.handleError(error, 'Complete service');
    }
  }

  /**
   * Get queue status for a branch
   * @param {number} branchId - Branch ID
   * @returns {Promise<Object>} Queue status data
   */
  async getQueueStatus(branchId) {
    try {
      const response = await this.axiosInstance.get(`/queue/status/${branchId}`);
      
      Logger.debug('Queue status response:', response.data);
      return response.data.data; // Return the actual data, not the wrapper
    } catch (error) {
      this.handleError(error, 'Get queue status');
    }
  }

  /**
   * Get active queue display data for a branch
   * @param {number} branchId - Branch ID
   * @returns {Promise<Object>} Display data
   */
  async getDisplayData(branchId) {
    try {
      const response = await this.axiosInstance.get(`/queue/display/${branchId}`);
      
      Logger.debug('Display data response:', response.data);
      return response.data.data; // Return the actual data, not the wrapper
    } catch (error) {
      this.handleError(error, 'Get display data');
    }
  }

  /**
   * Get clerk's work history
   * @param {number} userId - User ID
   * @param {string} token - Auth token
   * @returns {Promise<Array>} Work history
   */
  async getWorkHistory(userId, token) {
    try {
      const response = await this.axiosInstance.get(`/queue/history/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      this.handleError(error, 'Get work history');
    }
  }
}

// Export singleton instance
export default new DatabaseService();