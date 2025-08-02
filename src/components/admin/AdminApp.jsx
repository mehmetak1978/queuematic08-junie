/**
 * Admin App Component
 * Interface for administrators to manage users, branches, and system monitoring
 */

import { useState, useEffect } from 'react';
import DatabaseService from '../../services/DatabaseService.js';
import AuthService from '../../services/AuthService.js';
import AppConfig from '../../config/AppConfig.js';
import Logger from '../../utils/Logger.js';
import User from '../../models/User.js';
import Branch from '../../models/Branch.js';
import './AdminApp.css';

const AdminApp = () => {
  const [currentUser] = useState(AuthService.getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const refreshInterval = AppConfig.get('refreshIntervals.adminApp');

  useEffect(() => {
    if (currentUser?.isAdmin()) {
      loadInitialData();
      
      // Set up auto-refresh for dashboard
      const interval = setInterval(() => {
        if (activeTab === 'dashboard') {
          loadSystemStats();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [currentUser, activeTab, refreshInterval]);

  /**
   * Load initial data for admin panel
   */
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadBranches(),
        loadSystemStats()
      ]);
    } catch (error) {
      Logger.error('Error loading initial data:', error);
      setError('Veri yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load all users
   */
  const loadUsers = async () => {
    try {
      const usersData = await DatabaseService.getUsers(AuthService.getToken());
      setUsers(usersData.map(u => User.fromAPI(u)));
      Logger.debug('Users loaded:', usersData);
    } catch (error) {
      Logger.error('Error loading users:', error);
      throw error;
    }
  };

  /**
   * Load all branches
   */
  const loadBranches = async () => {
    try {
      const branchesData = await DatabaseService.getBranches(AuthService.getToken());
      setBranches(branchesData.map(b => Branch.fromAPI(b)));
      Logger.debug('Branches loaded:', branchesData);
    } catch (error) {
      Logger.error('Error loading branches:', error);
      throw error;
    }
  };

  /**
   * Load system statistics
   */
  const loadSystemStats = async () => {
    try {
      // This would be a new endpoint for system statistics
      // For now, we'll calculate basic stats from existing data
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        totalBranches: branches.length,
        activeBranches: branches.filter(b => b.isActive).length,
        totalCounters: branches.reduce((sum, b) => sum + (b.countersCount || 0), 0),
        activeCounters: branches.reduce((sum, b) => sum + (b.activeCountersCount || 0), 0)
      };
      setSystemStats(stats);
      Logger.debug('System stats calculated:', stats);
    } catch (error) {
      Logger.error('Error loading system stats:', error);
      throw error;
    }
  };

  /**
   * Handle tab change
   * @param {string} tab - Tab name
   */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
  };

  /**
   * Handle user creation/editing
   * @param {Object} userData - User data
   */
  const handleUserSubmit = async (userData) => {
    setIsLoading(true);
    setError('');

    try {
      if (editingUser) {
        // Update user logic would go here
        Logger.info('User update not implemented yet');
      } else {
        await DatabaseService.createUser(userData, AuthService.getToken());
        await loadUsers();
        Logger.info('User created successfully');
      }
      
      setShowUserForm(false);
      setEditingUser(null);
    } catch (error) {
      Logger.error('Error saving user:', error);
      setError('Kullanıcı kaydedilirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle user editing
   * @param {User} user - User to edit
   */
  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  /**
   * Handle user deletion
   * @param {User} user - User to delete
   */
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`${user.getDisplayName()} kullanıcısını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    setIsLoading(true);
    try {
      // Delete user logic would go here
      Logger.info('User deletion not implemented yet');
      await loadUsers();
    } catch (error) {
      Logger.error('Error deleting user:', error);
      setError('Kullanıcı silinirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser?.isAdmin()) {
    return (
      <div className="admin-app">
        <div className="access-denied">
          <h1>Erişim Reddedildi</h1>
          <p>Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <h1 className="admin-title">Sistem Yönetimi</h1>
          <p className="admin-subtitle">Hoş geldiniz, {currentUser.getDisplayName()}</p>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <span className="tab-icon">📊</span>
            Dashboard
          </button>
          <button
            onClick={() => handleTabChange('users')}
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          >
            <span className="tab-icon">👥</span>
            Kullanıcılar
          </button>
          <button
            onClick={() => handleTabChange('branches')}
            className={`tab-button ${activeTab === 'branches' ? 'active' : ''}`}
          >
            <span className="tab-icon">🏢</span>
            Şubeler
          </button>
          <button
            onClick={() => handleTabChange('system')}
            className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
          >
            <span className="tab-icon">⚙️</span>
            Sistem
          </button>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Tab Content */}
        <div className="tab-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-content">
              <h2 className="content-title">Sistem Özeti</h2>
              
              {systemStats && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <div className="stat-value">{systemStats.activeUsers}/{systemStats.totalUsers}</div>
                      <div className="stat-label">Aktif Kullanıcılar</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🏢</div>
                    <div className="stat-info">
                      <div className="stat-value">{systemStats.activeBranches}/{systemStats.totalBranches}</div>
                      <div className="stat-label">Aktif Şubeler</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🏪</div>
                    <div className="stat-info">
                      <div className="stat-value">{systemStats.activeCounters}/{systemStats.totalCounters}</div>
                      <div className="stat-label">Aktif Gişeler</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-info">
                      <div className="stat-value">
                        {systemStats.totalCounters > 0 ? 
                          Math.round((systemStats.activeCounters / systemStats.totalCounters) * 100) : 0}%
                      </div>
                      <div className="stat-label">Sistem Kullanımı</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="dashboard-sections">
                <div className="recent-activity">
                  <h3 className="section-title">Son Aktiviteler</h3>
                  <div className="activity-list">
                    <div className="activity-item">
                      <span className="activity-time">10:30</span>
                      <span className="activity-text">Sistem başlatıldı</span>
                    </div>
                    <div className="activity-item">
                      <span className="activity-time">10:25</span>
                      <span className="activity-text">Veritabanı bağlantısı kuruldu</span>
                    </div>
                  </div>
                </div>

                <div className="system-health">
                  <h3 className="section-title">Sistem Durumu</h3>
                  <div className="health-indicators">
                    <div className="health-item">
                      <span className="health-status healthy">●</span>
                      <span className="health-label">Veritabanı</span>
                    </div>
                    <div className="health-item">
                      <span className="health-status healthy">●</span>
                      <span className="health-label">API Servisi</span>
                    </div>
                    <div className="health-item">
                      <span className="health-status healthy">●</span>
                      <span className="health-label">Otomatik Yenileme</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="users-content">
              <div className="content-header">
                <h2 className="content-title">Kullanıcı Yönetimi</h2>
                <button
                  onClick={() => setShowUserForm(true)}
                  className="add-button"
                  disabled={isLoading}
                >
                  <span className="button-icon">➕</span>
                  Yeni Kullanıcı
                </button>
              </div>

              <div className="users-table">
                <div className="table-header">
                  <div className="table-cell">Ad Soyad</div>
                  <div className="table-cell">Kullanıcı Adı</div>
                  <div className="table-cell">Rol</div>
                  <div className="table-cell">Şube</div>
                  <div className="table-cell">Durum</div>
                  <div className="table-cell">İşlemler</div>
                </div>
                
                {users.map((user) => (
                  <div key={user.id} className="table-row">
                    <div className="table-cell">{user.getDisplayName()}</div>
                    <div className="table-cell">{user.username}</div>
                    <div className="table-cell">
                      <span className={`role-badge ${user.role}`}>
                        {user.getRoleDisplayName()}
                      </span>
                    </div>
                    <div className="table-cell">{user.branchName || '-'}</div>
                    <div className="table-cell">
                      <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <div className="table-cell">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="action-button edit"
                        disabled={isLoading}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="action-button delete"
                        disabled={isLoading}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Branches Tab */}
          {activeTab === 'branches' && (
            <div className="branches-content">
              <div className="content-header">
                <h2 className="content-title">Şube Yönetimi</h2>
              </div>

              <div className="branches-grid">
                {branches.map((branch) => (
                  <div key={branch.id} className="branch-card">
                    <div className="branch-header">
                      <h3 className="branch-name">{branch.getDisplayName()}</h3>
                      <span className={`status-badge ${branch.isActive ? 'active' : 'inactive'}`}>
                        {branch.getStatusText()}
                      </span>
                    </div>
                    <div className="branch-info">
                      <div className="branch-detail">
                        <span className="detail-label">Adres:</span>
                        <span className="detail-value">{branch.getFormattedAddress()}</span>
                      </div>
                      <div className="branch-detail">
                        <span className="detail-label">Telefon:</span>
                        <span className="detail-value">{branch.getFormattedPhone()}</span>
                      </div>
                    </div>
                    <div className="branch-stats">
                      <div className="branch-stat">
                        <span className="stat-value">{branch.countersCount || 0}</span>
                        <span className="stat-label">Toplam Gişe</span>
                      </div>
                      <div className="branch-stat">
                        <span className="stat-value">{branch.activeCountersCount || 0}</span>
                        <span className="stat-label">Aktif Gişe</span>
                      </div>
                      <div className="branch-stat">
                        <span className="stat-value">{branch.waitingQueueCount || 0}</span>
                        <span className="stat-label">Bekleyen</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="system-content">
              <h2 className="content-title">Sistem Ayarları</h2>
              
              <div className="system-sections">
                <div className="system-section">
                  <h3 className="section-title">Yapılandırma</h3>
                  <div className="config-list">
                    <div className="config-item">
                      <span className="config-label">Müşteri App Yenileme:</span>
                      <span className="config-value">{AppConfig.get('refreshIntervals.customerApp') / 1000}s</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">Gişe App Yenileme:</span>
                      <span className="config-value">{AppConfig.get('refreshIntervals.clerkApp') / 1000}s</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">Pano Yenileme:</span>
                      <span className="config-value">{AppConfig.get('refreshIntervals.displayPanel') / 1000}s</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">Log Seviyesi:</span>
                      <span className="config-value">{AppConfig.get('logging.level')}</span>
                    </div>
                  </div>
                </div>

                <div className="system-section">
                  <h3 className="section-title">Sistem Bilgileri</h3>
                  <div className="info-list">
                    <div className="info-item">
                      <span className="info-label">Uygulama Adı:</span>
                      <span className="info-value">{AppConfig.get('app.name')}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Versiyon:</span>
                      <span className="info-value">{AppConfig.get('app.version')}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Oturum Süresi:</span>
                      <span className="info-value">{AppConfig.get('app.sessionTimeout') / (1000 * 60)} dakika</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Auto Refresh Info */}
        <div className="auto-refresh-info">
          <span className="refresh-icon">🔄</span>
          <span className="refresh-text">
            Dashboard otomatik olarak {Math.floor(refreshInterval / 1000)} saniyede bir yenilenir
          </span>
        </div>
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <UserFormModal
          user={editingUser}
          branches={branches}
          onSubmit={handleUserSubmit}
          onCancel={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

/**
 * User Form Modal Component
 */
const UserFormModal = ({ user, branches, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    fullName: user?.fullName || '',
    role: user?.role || 'clerk',
    branchId: user?.branchId || '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!user && formData.password !== formData.confirmPassword) {
      alert('Şifreler eşleşmiyor');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h3>
          <button onClick={onCancel} className="modal-close">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-group">
            <label htmlFor="fullName">Ad Soyad</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Kullanıcı Adı</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Rol</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
            >
              <option value="clerk">Gişe Görevlisi</option>
              <option value="admin">Yönetici</option>
            </select>
          </div>

          {formData.role === 'clerk' && (
            <div className="form-group">
              <label htmlFor="branchId">Şube</label>
              <select
                id="branchId"
                name="branchId"
                value={formData.branchId}
                onChange={handleInputChange}
                required
              >
                <option value="">Şube Seçin</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.getDisplayName()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!user && (
            <>
              <div className="form-group">
                <label htmlFor="password">Şifre</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Şifre Tekrar</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-button">
              İptal
            </button>
            <button type="submit" disabled={isLoading} className="submit-button">
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminApp;