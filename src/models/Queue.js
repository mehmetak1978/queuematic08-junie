/**
 * Queue Model
 * Represents a queue number in the system
 */

class Queue {
  constructor(data = {}) {
    this.id = data.id || null;
    this.branchId = data.branch_id || data.branchId || null;
    this.branchName = data.branch_name || data.branchName || '';
    this.queueNumber = data.queue_number || data.queueNumber || data.number || 0;
    this.status = data.status || 'waiting';
    this.createdAt = data.created_at ? new Date(data.created_at) : data.createdAt ? new Date(data.createdAt) : null;
    this.calledAt = data.called_at ? new Date(data.called_at) : data.calledAt ? new Date(data.calledAt) : null;
    this.completedAt = data.completed_at ? new Date(data.completed_at) : data.completedAt ? new Date(data.completedAt) : null;
    
    // Counter and clerk information
    this.counterId = data.counter_id || data.counterId || null;
    this.counterNumber = data.counter_number || data.counterNumber || null;
    this.counterName = data.counter_name || data.counterName || '';
    this.servedBy = data.served_by || data.servedBy || null;
    this.servedByName = data.served_by_name || data.servedByName || '';
  }

  /**
   * Get queue status display text
   * @returns {string} Status display text
   */
  getStatusText() {
    const statusTexts = {
      waiting: 'Bekliyor',
      called: 'Çağrıldı',
      serving: 'Hizmet Veriliyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi'
    };
    
    return statusTexts[this.status] || this.status;
  }

  /**
   * Get queue status color
   * @returns {string} Status color
   */
  getStatusColor() {
    const statusColors = {
      waiting: '#ffc107',    // Yellow
      called: '#17a2b8',     // Info blue
      serving: '#007bff',    // Primary blue
      completed: '#28a745',  // Success green
      cancelled: '#dc3545'   // Danger red
    };
    
    return statusColors[this.status] || '#6c757d';
  }

  /**
   * Check if queue is active (waiting, called, or serving)
   * @returns {boolean} True if active
   */
  isActive() {
    return ['waiting', 'called', 'serving'].includes(this.status);
  }

  /**
   * Check if queue is completed
   * @returns {boolean} True if completed
   */
  isCompleted() {
    return this.status === 'completed';
  }

  /**
   * Check if queue is cancelled
   * @returns {boolean} True if cancelled
   */
  isCancelled() {
    return this.status === 'cancelled';
  }

  /**
   * Check if queue is currently being served
   * @returns {boolean} True if being served
   */
  isBeingServed() {
    return this.status === 'serving';
  }

  /**
   * Get waiting time in minutes
   * @returns {number} Waiting time in minutes
   */
  getWaitingTime() {
    if (!this.createdAt) {
      return 0;
    }
    
    const endTime = this.calledAt || new Date();
    const diffMs = endTime - this.createdAt;
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Get service time in minutes
   * @returns {number} Service time in minutes
   */
  getServiceTime() {
    if (!this.calledAt) {
      return 0;
    }
    
    const endTime = this.completedAt || new Date();
    const diffMs = endTime - this.calledAt;
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Get total time in system in minutes
   * @returns {number} Total time in minutes
   */
  getTotalTime() {
    if (!this.createdAt) {
      return 0;
    }
    
    const endTime = this.completedAt || new Date();
    const diffMs = endTime - this.createdAt;
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Get formatted waiting time
   * @returns {string} Formatted waiting time
   */
  getFormattedWaitingTime() {
    const minutes = this.getWaitingTime();
    
    if (minutes < 60) {
      return `${minutes} dakika`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours} saat ${remainingMinutes} dakika`;
  }

  /**
   * Get formatted service time
   * @returns {string} Formatted service time
   */
  getFormattedServiceTime() {
    const minutes = this.getServiceTime();
    
    if (minutes < 60) {
      return `${minutes} dakika`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours} saat ${remainingMinutes} dakika`;
  }

  /**
   * Get counter display name
   * @returns {string} Counter display name
   */
  getCounterDisplayName() {
    if (this.counterName) {
      return this.counterName;
    }
    
    if (this.counterNumber) {
      return `Gişe ${this.counterNumber}`;
    }
    
    return 'Gişe belirtilmemiş';
  }

  /**
   * Get served by display name
   * @returns {string} Served by display name
   */
  getServedByDisplayName() {
    return this.servedByName || 'Görevli belirtilmemiş';
  }

  /**
   * Get formatted creation time
   * @returns {string} Formatted creation time
   */
  getFormattedCreatedAt() {
    if (!this.createdAt) {
      return 'Bilinmiyor';
    }
    
    return this.createdAt.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get formatted called time
   * @returns {string} Formatted called time
   */
  getFormattedCalledAt() {
    if (!this.calledAt) {
      return 'Henüz çağrılmadı';
    }
    
    return this.calledAt.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get formatted completion time
   * @returns {string} Formatted completion time
   */
  getFormattedCompletedAt() {
    if (!this.completedAt) {
      return 'Henüz tamamlanmadı';
    }
    
    return this.completedAt.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Convert to plain object for API calls
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      branchId: this.branchId,
      queueNumber: this.queueNumber,
      status: this.status,
      createdAt: this.createdAt,
      calledAt: this.calledAt,
      completedAt: this.completedAt,
      counterId: this.counterId,
      servedBy: this.servedBy
    };
  }

  /**
   * Create Queue instance from API response
   * @param {Object} data - API response data
   * @returns {Queue} Queue instance
   */
  static fromAPI(data) {
    // Validate that we have proper queue data
    if (!data || typeof data !== 'object') {
      console.error('Invalid queue data received in fromAPI:', data);
      throw new Error('Invalid queue data: data must be an object');
    }
    
    // Warn if ID is missing - this helps catch API response structure issues
    if (!data.id && data.id !== 0) {
      console.warn('Queue data missing ID field - this may cause issues:', data);
    }
    
    return new Queue(data);
  }

  /**
   * Validate queue data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.branchId) {
      errors.push('Şube seçimi zorunludur');
    }

    if (!this.queueNumber || this.queueNumber < 1) {
      errors.push('Sıra numarası 1 veya daha büyük olmalıdır');
    }

    const validStatuses = ['waiting', 'called', 'serving', 'completed', 'cancelled'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Geçersiz sıra durumu');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get queue priority (lower number = higher priority)
   * @returns {number} Priority value
   */
  getPriority() {
    const statusPriority = {
      serving: 1,
      called: 2,
      waiting: 3,
      completed: 4,
      cancelled: 5
    };
    
    return statusPriority[this.status] || 6;
  }

  /**
   * Compare queues for sorting
   * @param {Queue} other - Other queue to compare
   * @returns {number} Comparison result
   */
  compareTo(other) {
    // First sort by priority (status)
    const priorityDiff = this.getPriority() - other.getPriority();
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Then sort by creation time (older first)
    if (this.createdAt && other.createdAt) {
      return this.createdAt - other.createdAt;
    }
    
    // Finally sort by queue number
    return this.queueNumber - other.queueNumber;
  }
}

export default Queue;