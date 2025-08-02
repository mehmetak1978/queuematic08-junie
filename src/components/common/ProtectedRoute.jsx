/**
 * Protected Route Component
 * Handles route protection based on authentication and authorization
 */

import { useEffect, useState } from 'react';
import AuthService from '../../services/AuthService.js';
import Logger from '../../utils/Logger.js';
import LoginForm from '../auth/LoginForm.jsx';

const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  requiredRole = null, 
  requiredBranchAccess = null,
  fallback = null 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(AuthService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const authenticated = AuthService.isAuthenticated();
      const user = AuthService.getCurrentUser();
      
      setIsAuthenticated(authenticated);
      setCurrentUser(user);
      setIsLoading(false);
      
      Logger.debug('ProtectedRoute auth check:', { 
        authenticated, 
        user: user?.username,
        role: user?.role 
      });
    };

    // Initial check
    checkAuth();

    // Listen for auth changes
    const handleAuthChange = () => {
      checkAuth();
    };

    AuthService.addEventListener('login', handleAuthChange);
    AuthService.addEventListener('logout', handleAuthChange);

    return () => {
      AuthService.removeEventListener('login', handleAuthChange);
      AuthService.removeEventListener('logout', handleAuthChange);
    };
  }, []);

  /**
   * Handle successful login
   * @param {User} user - Authenticated user
   */
  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    AuthService.emitEvent('login', user);
    Logger.info('User authenticated via ProtectedRoute');
  };

  /**
   * Handle login error
   * @param {Error} error - Login error
   */
  const handleLoginError = (error) => {
    Logger.error('Login error in ProtectedRoute:', error);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  // Check if authentication is required
  if (requireAuth && !isAuthenticated) {
    Logger.info(`Authentication required for protected route, showing login form inline`);
    return (
      <LoginForm 
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          Logger.info(`Login successful, user will see protected content at current URL`);
          // After successful login, the user will see the protected content
          // No navigation needed - React will re-render with authenticated state
        }}
        onLoginError={handleLoginError}
      />
    );
  }

  // Check role requirements
  if (requiredRole && currentUser) {
    if (Array.isArray(requiredRole)) {
      // Multiple roles allowed
      if (!requiredRole.includes(currentUser.role)) {
        Logger.warning(`Access denied. Required roles: ${requiredRole.join(', ')}, User role: ${currentUser.role}`);
        return fallback || (
          <div className="access-denied">
            <h2>Erişim Reddedildi</h2>
            <p>Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
            <p>Gerekli rol: {requiredRole.join(' veya ')}</p>
            <p>Mevcut rol: {currentUser.getRoleDisplayName()}</p>
          </div>
        );
      }
    } else {
      // Single role required
      if (currentUser.role !== requiredRole) {
        Logger.warning(`Access denied. Required role: ${requiredRole}, User role: ${currentUser.role}`);
        return fallback || (
          <div className="access-denied">
            <h2>Erişim Reddedildi</h2>
            <p>Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
            <p>Gerekli rol: {requiredRole === 'admin' ? 'Yönetici' : 'Gişe Görevlisi'}</p>
            <p>Mevcut rol: {currentUser.getRoleDisplayName()}</p>
          </div>
        );
      }
    }
  }

  // Check branch access requirements
  if (requiredBranchAccess && currentUser) {
    if (!currentUser.hasAccessToBranch(requiredBranchAccess)) {
      Logger.warning(`Branch access denied. Required branch: ${requiredBranchAccess}, User branch: ${currentUser.branchId}`);
      return fallback || (
        <div className="access-denied">
          <h2>Şube Erişimi Reddedildi</h2>
          <p>Bu şubeye erişim yetkiniz bulunmamaktadır.</p>
          <p>Sadece kendi şubenizin verilerine erişebilirsiniz.</p>
        </div>
      );
    }
  }

  // All checks passed, render children
  return children;
};

export default ProtectedRoute;