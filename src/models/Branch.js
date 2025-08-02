/**
 * Branch Model
 * Represents a branch/location in the system
 */

class Branch {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.address = data.address || '';
    this.phone = data.phone || '';
    this.isActive = data.is_active !== undefined ? data.is_active : data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.created_at ? new Date(data.created_at) : data.createdAt ? new Date(data.createdAt) : null;
    this.updatedAt = data.updated_at ? new Date(data.updated_at) : data.updatedAt ? new Date(data.updatedAt) : null;
    
    // Additional computed properties
    this.countersCount = data.counters_count || data.countersCount || 0;
    this.activeCountersCount = data.active_counters_count || data.activeCountersCount || 0;
    this.waitingQueueCount = data.waiting_queue_count || data.waitingQueueCount || 0;
  }

  /**
   * Get display name for the branch
   * @returns {string} Display name
   */
  getDisplayName() {
    return this.name;
  }

  /**
   * Get formatted address
   * @returns {string} Formatted address
   */
  getFormattedAddress() {
    return this.address || 'Adres belirtilmemiş';
  }

  /**
   * Get formatted phone number
   * @returns {string} Formatted phone number
   */
  getFormattedPhone() {
    return this.phone || 'Telefon belirtilmemiş';
  }

  /**
   * Check if branch is operational
   * @returns {boolean} True if branch is active and has counters
   */
  isOperational() {
    return this.isActive && this.countersCount > 0;
  }

  /**
   * Get branch status text
   * @returns {string} Status text
   */
  getStatusText() {
    if (!this.isActive) {
      return 'Pasif';
    }
    
    if (this.countersCount === 0) {
      return 'Gişe Yok';
    }
    
    if (this.activeCountersCount === 0) {
      return 'Kapalı';
    }
    
    return 'Aktif';
  }

  /**
   * Get branch statistics summary
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      totalCounters: this.countersCount,
      activeCounters: this.activeCountersCount,
      waitingCustomers: this.waitingQueueCount,
      utilizationRate: this.countersCount > 0 ? (this.activeCountersCount / this.countersCount * 100).toFixed(1) : 0
    };
  }

  /**
   * Convert to plain object for API calls
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      address: this.address,
      phone: this.phone,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Branch instance from API response
   * @param {Object} data - API response data
   * @returns {Branch} Branch instance
   */
  static fromAPI(data) {
    return new Branch(data);
  }

  /**
   * Validate branch data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length < 2) {
      errors.push('Şube adı en az 2 karakter olmalıdır');
    }

    if (this.phone && !/^[+]?[0-9\s\-()]{10,}$/.test(this.phone)) {
      errors.push('Geçersiz telefon numarası formatı');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default Branch;