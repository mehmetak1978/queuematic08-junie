/**
 * Customer App Component
 * Interface for customers to take queue numbers and view status
 */

import { useState, useEffect, useRef } from 'react';
import DatabaseService from '../../services/DatabaseService.js';
import AuthService from '../../services/AuthService.js';
import AppConfig from '../../config/AppConfig.js';
import Logger from '../../utils/Logger.js';
import LayoutManager from '../../utils/LayoutManager.js';
import Queue from '../../models/Queue.js';
import './CustomerApp.css';

const CustomerApp = () => {
  const [currentUser] = useState(AuthService.getCurrentUser());
  const [queueStatus, setQueueStatus] = useState(null);
  const [recentNumbers, setRecentNumbers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastCalledNumber, setLastCalledNumber] = useState(null);
  const customerContainerRef = useRef(null);

  const refreshInterval = AppConfig.get('refreshIntervals.customerApp');

  useEffect(() => {
    if (currentUser?.branchId) {
      loadQueueStatus();
      
      // Set up auto-refresh
      const interval = setInterval(() => {
        loadQueueStatus();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [currentUser, refreshInterval]);

  // Apply layout when component mounts and when layout changes
  useEffect(() => {
    const applyLayout = () => {
      if (customerContainerRef.current) {
        LayoutManager.applyLayoutToComponent(customerContainerRef.current, {
          useContentHeight: true,
          additionalOffset: 0
        });
      }
    };

    // Apply initial layout
    applyLayout();

    // Register for layout change notifications
    LayoutManager.addObserver('customerApp', (event, data) => {
      if (event === 'layoutRecalculated' || event === 'navigationResize') {
        applyLayout();
        Logger.debug('CustomerApp layout updated', data);
      }
    });

    return () => {
      LayoutManager.removeObserver('customerApp');
    };
  }, []);

  /**
   * Load queue status for the current branch
   */
  const loadQueueStatus = async () => {
    if (!currentUser?.branchId) return;

    try {
      const status = await DatabaseService.getQueueStatus(currentUser.branchId);
      setQueueStatus(status);
      
      if (status.lastCalled) {
        setLastCalledNumber(Queue.fromAPI(status.lastCalled));
      }

      Logger.debug('Queue status loaded:', status);
    } catch (error) {
      Logger.error('Error loading queue status:', error);
      setError('Sıra durumu yüklenirken hata oluştu');
    }
  };

  /**
   * Take a new queue number
   */
  const takeQueueNumber = async () => {
    if (!currentUser?.branchId) return;

    setIsLoading(true);
    setError('');

    try {
      const newQueue = await DatabaseService.getNextQueueNumber(currentUser.branchId);
      const queueObj = Queue.fromAPI(newQueue.data || newQueue);
      
      // Add to recent numbers
      setRecentNumbers(prev => [queueObj, ...prev.slice(0, 4)]);
      
      // Refresh status
      await loadQueueStatus();
      
      Logger.info('New queue number taken:', newQueue);
    } catch (error) {
      Logger.error('Error taking queue number:', error);
      
      let errorMessage = 'Sıra numarası alınırken hata oluştu';
      if (error.message.includes('Branch not operational')) {
        errorMessage = 'Şube şu anda hizmet vermiyor';
      } else if (error.message.includes('No available counters')) {
        errorMessage = 'Şu anda müsait gişe bulunmuyor';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get waiting time estimate
   * @returns {string} Estimated waiting time
   */
  const getWaitingTimeEstimate = () => {
    if (!queueStatus || !queueStatus.waitingCount) {
      return 'Bekleme yok';
    }

    const avgServiceTime = queueStatus.averageServiceTime || 5; // minutes
    const activeCounters = queueStatus.activeCounters || 1;
    const estimatedMinutes = Math.ceil((queueStatus.waitingCount * avgServiceTime) / activeCounters);

    if (estimatedMinutes < 60) {
      return `Yaklaşık ${estimatedMinutes} dakika`;
    }

    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;
    return `Yaklaşık ${hours} saat ${minutes} dakika`;
  };

  if (!currentUser) {
    return (
      <div className="customer-app">
        <div className="error-message">
          Kullanıcı bilgisi bulunamadı
        </div>
      </div>
    );
  }

  return (
    <div className="customer-app">
      <div className="customer-container" ref={customerContainerRef}>
        {/* Header */}
        <div className="customer-header">
          <p className="customer-subtitle">{currentUser.branchName}</p>
        </div>

        {/* Current Status */}
        <div className="status-section">
          <div className="status-card">
            <h2 className="status-title">Mevcut Durum</h2>
            
            {lastCalledNumber && (
              <div className="last-called">
                <span className="last-called-label">Son Çağrılan:</span>
                <span className="last-called-number">{lastCalledNumber.queueNumber}</span>
                <span className="last-called-counter">
                  {lastCalledNumber.getCounterDisplayName()}
                </span>
              </div>
            )}

            <div className="status-info">
              <div className="status-item">
                <span className="status-label">Bekleyen:</span>
                <span className="status-value">{queueStatus?.waitingCount || 0}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Aktif Gişe:</span>
                <span className="status-value">{queueStatus?.activeCounters || 0}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Tahmini Bekleme:</span>
                <span className="status-value">{getWaitingTimeEstimate()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Take Number Button */}
        <div className="take-number-section">
          <button
            onClick={takeQueueNumber}
            disabled={isLoading || !queueStatus?.canTakeNumber}
            className={`take-number-button ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Sıra alınıyor...
              </>
            ) : (
              <>
                <span className="take-number-icon">🎫</span>
                Sıra Numarası Al
              </>
            )}
          </button>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {!queueStatus?.canTakeNumber && !isLoading && (
            <div className="info-message">
              <span className="info-icon">ℹ️</span>
              Şu anda sıra numarası alınamıyor
            </div>
          )}
        </div>

        {/* Recent Numbers */}
        {recentNumbers.length > 0 && (
          <div className="recent-numbers-section">
            <div className="recent-numbers">
              {recentNumbers.map((queue, index) => (
                <div key={`${queue.id}-${index}`} className="recent-number">
                  <span className="recent-number-value">{queue.queueNumber}</span>
                  <span className="recent-number-time">
                    {queue.getFormattedCreatedAt()}
                  </span>
                  <span className={`recent-number-status ${queue.status}`}>
                    {queue.getStatusText()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="instructions-section">
          <h3 className="instructions-title">Nasıl Kullanılır?</h3>
          <div className="instructions">
            <div className="instruction-item">
              <span className="instruction-number">1</span>
              <span className="instruction-text">
                "Sıra Numarası Al" butonuna tıklayın
              </span>
            </div>
            <div className="instruction-item">
              <span className="instruction-number">2</span>
              <span className="instruction-text">
                Numaranızın çağrılmasını bekleyin
              </span>
            </div>
            <div className="instruction-item">
              <span className="instruction-number">3</span>
              <span className="instruction-text">
                Numaranız çağrıldığında belirtilen gişeye gidin
              </span>
            </div>
          </div>
        </div>

        {/* Auto Refresh Info */}
        <div className="auto-refresh-info">
          <span className="refresh-icon">🔄</span>
          <span className="refresh-text">
            Sayfa otomatik olarak {Math.floor(refreshInterval / 1000)} saniyede bir yenilenir
          </span>
        </div>
      </div>
    </div>
  );
};

export default CustomerApp;