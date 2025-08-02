/**
 * Authentication Service
 * Handles user authentication, session management, and authorization
 */

import DatabaseService from './DatabaseService.js';
import User from '../models/User.js';
import AppConfig from '../config/AppConfig.js';
import Logger from '../utils/Logger.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.token = null;
    this.sessionTimeout = AppConfig.get('app.sessionTimeout');
    this.sessionTimer = null;
    
    // Initialize from localStorage if available
    this.initializeFromStorage();
  }

  /**
   * Initialize authentication state from localStorage
   */
  initializeFromStorage() {
    try {
      const storedToken = localStorage.getItem('queuematic_token');
      const storedUser = localStorage.getItem('queuematic_user');
      const storedExpiry = localStorage.getItem('queuematic_expiry');
      
      if (storedToken && storedUser && storedExpiry) {
        const expiryTime = new Date(storedExpiry);
        
        if (expiryTime > new Date()) {
          this.token = storedToken;
          this.currentUser = User.fromAPI(JSON.parse(storedUser));
          this.startSessionTimer();
          
          Logger.info('User session restored from storage', {
            username: this.currentUser.username,
            role: this.currentUser.role
          });
        } else {
          Logger.info('Stored session expired, clearing storage');
          this.clearStorage();
        }
      }
    } catch (error) {
      Logger.error('Error initializing from storage:', error);
      this.clearStorage();
    }
  }

  /**
   * Clear authentication data from localStorage
   */
  clearStorage() {
    localStorage.removeItem('queuematic_token');
    localStorage.removeItem('queuematic_user');
    localStorage.removeItem('queuematic_expiry');
  }

  /**
   * Save authentication data to localStorage
   */
  saveToStorage() {
    if (this.token && this.currentUser) {
      const expiryTime = new Date(Date.now() + this.sessionTimeout);
      
      localStorage.setItem('queuematic_token', this.token);
      localStorage.setItem('queuematic_user', JSON.stringify(this.currentUser.toJSON()));
      localStorage.setItem('queuematic_expiry', expiryTime.toISOString());
    }
  }

  /**
   * Start session timeout timer
   */
  startSessionTimer() {
    this.clearSessionTimer();
    
    this.sessionTimer = setTimeout(() => {
      Logger.warning('Session timeout reached, logging out user');
      this.logout();
    }, this.sessionTimeout);
  }

  /**
   * Clear session timeout timer
   */
  clearSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  /**
   * Reset session timeout timer (extend session)
   */
  resetSessionTimer() {
    if (this.isAuthenticated()) {
      this.startSessionTimer();
      this.saveToStorage(); // Update expiry time
    }
  }

  /**
   * Login user with username and password
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<User>} Authenticated user
   */
  async login(username, password) {
    try {
      Logger.info(`Attempting login for user: ${username}`);
      
      const response = await DatabaseService.login(username, password);
      
      if (response.data && response.data.user && response.data.token) {
        this.currentUser = User.fromAPI(response.data.user);
        this.token = response.data.token;
        
        this.saveToStorage();
        this.startSessionTimer();
        
        Logger.info(`User ${username} logged in successfully`, {
          role: this.currentUser.role,
          branchId: this.currentUser.branchId
        });
        
        return this.currentUser;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      Logger.error(`Login failed for user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Logout current user
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      if (this.token) {
        Logger.info(`Logging out user: ${this.currentUser?.username}`);
        
        try {
          await DatabaseService.logout(this.token);
        } catch (error) {
          Logger.warning('Error during server logout:', error);
          // Continue with local logout even if server logout fails
        }
      }
      
      this.currentUser = null;
      this.token = null;
      this.clearSessionTimer();
      this.clearStorage();
      
      Logger.info('User logged out successfully');
    } catch (error) {
      Logger.error('Error during logout:', error);
      // Clear local state even if there's an error
      this.currentUser = null;
      this.token = null;
      this.clearSessionTimer();
      this.clearStorage();
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return !!(this.currentUser && this.token);
  }

  /**
   * Get current authenticated user
   * @returns {User|null} Current user or null
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current authentication token
   * @returns {string|null} Current token or null
   */
  getToken() {
    return this.token;
  }

  /**
   * Check if current user is admin
   * @returns {boolean} True if admin
   */
  isAdmin() {
    return this.currentUser?.isAdmin() || false;
  }

  /**
   * Check if current user is clerk
   * @returns {boolean} True if clerk
   */
  isClerk() {
    return this.currentUser?.isClerk() || false;
  }

  /**
   * Check if current user has access to a specific branch
   * @param {number} branchId - Branch ID to check
   * @returns {boolean} True if has access
   */
  hasAccessToBranch(branchId) {
    return this.currentUser?.hasAccessToBranch(branchId) || false;
  }

  /**
   * Get current user's branch ID
   * @returns {number|null} Branch ID or null
   */
  getCurrentUserBranchId() {
    return this.currentUser?.branchId || null;
  }

  /**
   * Check if user has specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if has role
   */
  hasRole(role) {
    return this.currentUser?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   * @param {string[]} roles - Array of roles to check
   * @returns {boolean} True if has any of the roles
   */
  hasAnyRole(roles) {
    return roles.includes(this.currentUser?.role);
  }

  /**
   * Require authentication (throws error if not authenticated)
   * @throws {Error} If not authenticated
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required');
    }
  }

  /**
   * Require admin role (throws error if not admin)
   * @throws {Error} If not admin
   */
  requireAdmin() {
    this.requireAuth();
    
    if (!this.isAdmin()) {
      throw new Error('Admin role required');
    }
  }

  /**
   * Require clerk role (throws error if not clerk)
   * @throws {Error} If not clerk
   */
  requireClerk() {
    this.requireAuth();
    
    if (!this.isClerk()) {
      throw new Error('Clerk role required');
    }
  }

  /**
   * Require access to specific branch (throws error if no access)
   * @param {number} branchId - Branch ID to check
   * @throws {Error} If no access to branch
   */
  requireBranchAccess(branchId) {
    this.requireAuth();
    
    if (!this.hasAccessToBranch(branchId)) {
      throw new Error('Access to branch not allowed');
    }
  }

  /**
   * Get session remaining time in minutes
   * @returns {number} Remaining time in minutes
   */
  getSessionRemainingTime() {
    if (!this.isAuthenticated()) {
      return 0;
    }
    
    const expiryTime = localStorage.getItem('queuematic_expiry');
    if (!expiryTime) {
      return 0;
    }
    
    const expiry = new Date(expiryTime);
    const now = new Date();
    const diffMs = expiry - now;
    
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  }

  /**
   * Check if session is about to expire (less than 5 minutes)
   * @returns {boolean} True if session is about to expire
   */
  isSessionAboutToExpire() {
    return this.getSessionRemainingTime() < 5;
  }

  /**
   * Extend current session
   * @returns {Promise<void>}
   */
  async extendSession() {
    if (this.isAuthenticated()) {
      this.resetSessionTimer();
      Logger.info('Session extended');
    }
  }

  /**
   * Add authentication event listener
   * @param {string} event - Event name ('login', 'logout', 'sessionExpired')
   * @param {Function} callback - Callback function
   */
  addEventListener(event, callback) {
    if (!this.eventListeners) {
      this.eventListeners = {};
    }
    
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove authentication event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  removeEventListener(event, callback) {
    if (this.eventListeners && this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(callback);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  /**
   * Emit authentication event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emitEvent(event, data) {
    if (this.eventListeners && this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          Logger.error(`Error in auth event listener for ${event}:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export default new AuthService();