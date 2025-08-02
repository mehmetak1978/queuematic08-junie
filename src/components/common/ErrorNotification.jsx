/**
 * Enhanced Error Notification Component
 * Provides better visual feedback for error messages with animations and styling
 */

import { useState, useEffect } from 'react';
import './ErrorNotification.css';

const ErrorNotification = ({ 
  error, 
  onClose, 
  autoClose = true, 
  autoCloseDelay = 5000,
  type = 'error' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      setIsClosing(false);

      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error, autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, 300); // Animation duration
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      default:
        return '❌';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'warning':
        return 'notification-warning';
      case 'info':
        return 'notification-info';
      case 'success':
        return 'notification-success';
      default:
        return 'notification-error';
    }
  };

  if (!error || !isVisible) {
    return null;
  }

  return (
    <div className={`error-notification-overlay ${isClosing ? 'closing' : ''}`}>
      <div className={`error-notification ${getTypeClass()} ${isClosing ? 'slide-out' : 'slide-in'}`}>
        <div className="notification-header">
          <span className="notification-icon">{getIcon()}</span>
          <span className="notification-title">
            {type === 'warning' ? 'Uyarı' : 
             type === 'info' ? 'Bilgi' : 
             type === 'success' ? 'Başarılı' : 'Hata'}
          </span>
          <button 
            className="notification-close" 
            onClick={handleClose}
            aria-label="Bildirimi kapat"
          >
            ✕
          </button>
        </div>
        <div className="notification-content">
          <p className="notification-message">{error}</p>
        </div>
        {autoClose && (
          <div className="notification-progress">
            <div 
              className="notification-progress-bar"
              style={{ animationDuration: `${autoCloseDelay}ms` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorNotification;