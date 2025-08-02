/**
 * Login Form Component
 * Provides user interface for authentication
 */

import { useState } from 'react';
import AuthService from '../../services/AuthService.js';
import Logger from '../../utils/Logger.js';
import './LoginForm.css';

const LoginForm = ({ onLoginSuccess, onLoginError }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handle input changes
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const user = await AuthService.login(formData.username.trim(), formData.password);
      
      Logger.info('Login successful', { username: user.username, role: user.role });
      
      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (error) {
      Logger.error('Login failed:', error);
      
      let errorMessage = 'Giriş başarısız oldu';
      
      if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Kullanıcı adı veya şifre hatalı';
      } else if (error.message.includes('User not found')) {
        errorMessage = 'Kullanıcı bulunamadı';
      } else if (error.message.includes('User inactive')) {
        errorMessage = 'Kullanıcı hesabı pasif durumda';
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Bağlantı hatası. Lütfen tekrar deneyin.';
      }
      
      setError(errorMessage);
      
      if (onLoginError) {
        onLoginError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle key press events
   * @param {KeyboardEvent} e - Key press event
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Sıramatik Sistemi</h1>
          <p className="login-subtitle">Giriş Yapın</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Kullanıcı adınızı girin"
              disabled={isLoading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Şifrenizi girin"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Giriş yapılıyor...
              </>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-info">
            Sistem yöneticisinden kullanıcı bilgilerinizi alabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;