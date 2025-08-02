/**
 * Main Application Component
 * Handles routing and application structure for Queuematic System
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import CustomerApp from './components/customer/CustomerApp.jsx';
import ClerkApp from './components/clerk/ClerkApp.jsx';
import DisplayApp from './components/display/DisplayApp.jsx';
import AdminApp from './components/admin/AdminApp.jsx';
import AppNavigation from './components/common/AppNavigation.jsx';
import AuthService from './services/AuthService.js';
import Logger from './utils/Logger.js';
import LayoutManager from './utils/LayoutManager.js';
import './App.css';

function App() {
  useEffect(() => {
    // Initialize application
    Logger.logStartup();
    
    // Initialize LayoutManager for global CSS custom properties
    LayoutManager.initialize();
    
    // Check for existing session
    if (AuthService.isAuthenticated()) {
      const user = AuthService.getCurrentUser();
      Logger.info(`Existing session found for user: ${user?.username}`);
    }
  }, []);

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Login Route */}
          <Route 
            path="/login" 
            element={
              <LoginForm 
                onLoginSuccess={(user) => {
                  Logger.info(`Login successful, user: ${user.username}`);
                  // No redirect needed - let React Router handle the state change
                }}
              />
            } 
          />

          {/* Customer App - Accessible by clerks for their branch */}
          <Route 
            path="/customer" 
            element={
              <ProtectedRoute requiredRole="clerk">
                <AppNavigation />
                <CustomerApp />
              </ProtectedRoute>
            } 
          />

          {/* Clerk App - Accessible by clerks for their branch */}
          <Route 
            path="/clerk" 
            element={
              <ProtectedRoute requiredRole="clerk">
                <AppNavigation />
                <ClerkApp />
              </ProtectedRoute>
            } 
          />

          {/* Display Panel App - Accessible by clerks for their branch */}
          <Route 
            path="/display" 
            element={
              <ProtectedRoute requiredRole="clerk">
                <AppNavigation />
                <DisplayApp />
              </ProtectedRoute>
            } 
          />

          {/* Admin App - Accessible by admins only */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AppNavigation />
                <AdminApp />
              </ProtectedRoute>
            } 
          />

          {/* Root Route - Redirect based on user role */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <RoleBasedRedirect />
              </ProtectedRoute>
            } 
          />

          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

/**
 * Component to redirect users based on their role
 */
const RoleBasedRedirect = () => {
  const user = AuthService.getCurrentUser();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  if (user.isAdmin()) {
    Logger.info('Redirecting admin user to admin app');
    return <Navigate to="/admin" replace />;
  } else if (user.isClerk()) {
    Logger.info('Redirecting clerk user to clerk app');
    return <Navigate to="/clerk" replace />;
  }

  // Fallback to login if role is not recognized
  Logger.warning(`Unknown user role: ${user.role}, redirecting to login`);
  return <Navigate to="/login" replace />;
};

export default App;
