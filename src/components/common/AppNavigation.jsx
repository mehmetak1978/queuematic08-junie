/**
 * App Navigation Component
 * Provides navigation between different parts of the application
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthService from '../../services/AuthService.js';
import Logger from '../../utils/Logger.js';
import './AppNavigation.css';

const AppNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(AuthService.getCurrentUser());
  const [sessionTime, setSessionTime] = useState(AuthService.getSessionRemainingTime());

  useEffect(() => {
    // Update session time every minute
    const timer = setInterval(() => {
      setSessionTime(AuthService.getSessionRemainingTime());
    }, 60000);

    // Listen for auth changes
    const handleAuthChange = () => {
      setCurrentUser(AuthService.getCurrentUser());
      setSessionTime(AuthService.getSessionRemainingTime());
    };

    AuthService.addEventListener('login', handleAuthChange);
    AuthService.addEventListener('logout', handleAuthChange);

    return () => {
      clearInterval(timer);
      AuthService.removeEventListener('login', handleAuthChange);
      AuthService.removeEventListener('logout', handleAuthChange);
    };
  }, []);

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await AuthService.logout();
      Logger.info('User logged out via navigation');
      navigate('/login');
    } catch (error) {
      Logger.error('Logout error:', error);
      // Force navigation to login even if logout fails
      navigate('/login');
    }
  };

  /**
   * Handle navigation
   * @param {string} path - Path to navigate to
   */
  const handleNavigation = (path) => {
    Logger.debug(`Navigating to: ${path}`);
    navigate(path);
  };

  /**
   * Get navigation items based on user role
   * @returns {Array} Navigation items
   */
  const getNavigationItems = () => {
    if (!currentUser) return [];

    const items = [];

    if (currentUser.isAdmin()) {
      items.push(
        { path: '/admin', label: 'Yönetim Paneli', icon: '⚙️' }
      );
    } else if (currentUser.isClerk()) {
      items.push(
        { path: '/clerk', label: 'Gişe Yönetimi', icon: '👤' },
        { path: '/customer', label: 'Müşteri Paneli', icon: '🎫' },
        { path: '/display', label: 'Pano Görünümü', icon: '📺' }
      );
    }

    return items;
  };

  /**
   * Check if path is active
   * @param {string} path - Path to check
   * @returns {boolean} True if active
   */
  const isActivePath = (path) => {
    return location.pathname === path;
  };

  /**
   * Get session warning class
   * @returns {string} CSS class for session warning
   */
  const getSessionWarningClass = () => {
    if (sessionTime < 5) return 'session-critical';
    if (sessionTime < 10) return 'session-warning';
    return '';
  };

  if (!currentUser) {
    return null;
  }

  const navigationItems = getNavigationItems();

  return (
    <nav className="app-navigation">
      <div className="nav-container">
        {/* Logo and Title */}
        <div className="nav-brand">
          <h1 className="nav-title">Sıramatik</h1>
          <span className="nav-subtitle">{currentUser.branchName || 'Sistem'}</span>
        </div>

        {/* Navigation Items */}
        {navigationItems.length > 0 && (
          <div className="nav-items">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`nav-item ${isActivePath(item.path) ? 'active' : ''}`}
                title={item.label}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* User Info and Actions */}
        <div className="nav-user">
          {/* Session Timer */}
          <div className={`session-timer ${getSessionWarningClass()}`}>
            <span className="session-icon">⏱️</span>
            <span className="session-time">{sessionTime}dk</span>
          </div>

          {/* User Info */}
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{currentUser.getDisplayName()}</span>
              <span className="user-role">{currentUser.getRoleDisplayName()}</span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="logout-button"
            title="Çıkış Yap"
          >
            <span className="logout-icon">🚪</span>
            <span className="logout-label">Çıkış</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AppNavigation;