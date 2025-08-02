/**
 * Counter Model
 * Represents a service counter in a branch
 */

class Counter {
  constructor(data = {}) {
    this.id = data.id || null;
    this.branchId = data.branch_id || data.branchId || null;
    this.branchName = data.branch_name || data.branchName || '';
    this.counterNumber = data.counter_number || data.counterNumber || data.number || 0;
    this.name = data.name || '';
    this.isActive = data.is_active !== undefined ? data.is_active : data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.created_at ? new Date(data.created_at) : data.createdAt ? new Date(data.createdAt) : null;
    this.updatedAt = data.updated_at ? new Date(data.updated_at) : data.updatedAt ? new Date(data.updatedAt) : null;
    
    // Session related properties
    this.sessionId = data.session_id || data.sessionId || null;
    this.userId = data.user_id || data.userId || null;
    this.userName = data.user_name || data.userName || '';
    this.sessionStartedAt = data.session_started_at ? new Date(data.session_started_at) : data.sessionStartedAt ? new Date(data.sessionStartedAt) : null;
    this.isOccupied = data.is_occupied !== undefined ? data.is_occupied : data.isOccupied !== undefined ? data.isOccupied : false;
    
    // Current queue information
    this.currentQueueId = data.current_queue_id || data.currentQueueId || null;
    this.currentQueueNumber = data.current_queue_number || data.currentQueueNumber || null;
    this.currentQueueStatus = data.current_queue_status || data.currentQueueStatus || null;
  }

  /**
   * Get display name for the counter
   * @returns {string} Display name
   */
  getDisplayName() {
    return this.name || `Gişe ${this.counterNumber}`;
  }

  /**
   * Get full display name with branch
   * @returns {string} Full display name
   */
  getFullDisplayName() {
    return `${this.branchName} - ${this.getDisplayName()}`;
  }

  /**
   * Check if counter is available for assignment
   * @returns {boolean} True if counter is available
   */
  isAvailable() {
    return this.isActive && !this.isOccupied;
  }

  /**
   * Check if counter is currently serving a customer
   * @returns {boolean} True if serving
   */
  isServing() {
    return this.isOccupied && this.currentQueueId && this.currentQueueStatus === 'serving';
  }

  /**
   * Get counter status text
   * @returns {string} Status text
   */
  getStatusText() {
    if (!this.isActive) {
      return 'Pasif';
    }
    
    if (!this.isOccupied) {
      return 'Müsait';
    }
    
    if (this.currentQueueNumber) {
      return `${this.currentQueueNumber} numaralı müşteriyle`;
    }
    
    return 'Meşgul';
  }

  /**
   * Get counter status color
   * @returns {string} Status color
   */
  getStatusColor() {
    if (!this.isActive) {
      return '#6c757d'; // Gray
    }
    
    if (!this.isOccupied) {
      return '#28a745'; // Green
    }
    
    if (this.isServing()) {
      return '#007bff'; // Blue
    }
    
    return '#ffc107'; // Yellow
  }

  /**
   * Get session duration in minutes
   * @returns {number} Duration in minutes
   */
  getSessionDuration() {
    if (!this.sessionStartedAt) {
      return 0;
    }
    
    const now = new Date();
    const diffMs = now - this.sessionStartedAt;
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Get formatted session duration
   * @returns {string} Formatted duration
   */
  getFormattedSessionDuration() {
    const minutes = this.getSessionDuration();
    
    if (minutes < 60) {
      return `${minutes} dakika`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours} saat ${remainingMinutes} dakika`;
  }

  /**
   * Convert to plain object for API calls
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      branchId: this.branchId,
      counterNumber: this.counterNumber,
      name: this.name,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Counter instance from API response
   * @param {Object} data - API response data
   * @returns {Counter} Counter instance
   */
  static fromAPI(data) {
    return new Counter(data);
  }

  /**
   * Validate counter data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.branchId) {
      errors.push('Şube seçimi zorunludur');
    }

    if (!this.counterNumber || this.counterNumber < 1) {
      errors.push('Gişe numarası 1 veya daha büyük olmalıdır');
    }

    if (this.name && this.name.length > 50) {
      errors.push('Gişe adı 50 karakterden uzun olamaz');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default Counter;