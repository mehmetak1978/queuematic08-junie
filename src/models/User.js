/**
 * User Model
 * Represents a user in the system (admin or clerk)
 */

class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.username = data.username || '';
    this.fullName = data.full_name || data.fullName || '';
    this.role = data.role || 'clerk';
    this.branchId = data.branch_id || data.branchId || null;
    this.branchName = data.branch_name || data.branchName || '';
    this.isActive = data.is_active !== undefined ? data.is_active : data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.created_at ? new Date(data.created_at) : data.createdAt ? new Date(data.createdAt) : null;
    this.updatedAt = data.updated_at ? new Date(data.updated_at) : data.updatedAt ? new Date(data.updatedAt) : null;
    this.token = data.token || null;
  }

  /**
   * Check if user is admin
   * @returns {boolean} True if user is admin
   */
  isAdmin() {
    return this.role === 'admin';
  }

  /**
   * Check if user is clerk
   * @returns {boolean} True if user is clerk
   */
  isClerk() {
    return this.role === 'clerk';
  }

  /**
   * Check if user has access to a specific branch
   * @param {number} branchId - Branch ID to check
   * @returns {boolean} True if user has access
   */
  hasAccessToBranch(branchId) {
    // Admin has access to all branches
    if (this.isAdmin()) {
      return true;
    }
    
    // Clerk only has access to their assigned branch
    return this.branchId === branchId;
  }

  /**
   * Get display name for the user
   * @returns {string} Display name
   */
  getDisplayName() {
    return this.fullName || this.username;
  }

  /**
   * Get role display name
   * @returns {string} Role display name
   */
  getRoleDisplayName() {
    const roleNames = {
      admin: 'Yönetici',
      clerk: 'Gişe Görevlisi'
    };
    
    return roleNames[this.role] || this.role;
  }

  /**
   * Convert to plain object for API calls
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      fullName: this.fullName,
      role: this.role,
      branchId: this.branchId,
      branchName: this.branchName,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create User instance from API response
   * @param {Object} data - API response data
   * @returns {User} User instance
   */
  static fromAPI(data) {
    return new User(data);
  }

  /**
   * Validate user data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.username || this.username.trim().length < 3) {
      errors.push('Kullanıcı adı en az 3 karakter olmalıdır');
    }

    if (!this.fullName || this.fullName.trim().length < 2) {
      errors.push('Ad soyad en az 2 karakter olmalıdır');
    }

    if (!['admin', 'clerk'].includes(this.role)) {
      errors.push('Geçersiz kullanıcı rolü');
    }

    if (this.role === 'clerk' && !this.branchId) {
      errors.push('Gişe görevlisi için şube seçimi zorunludur');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default User;