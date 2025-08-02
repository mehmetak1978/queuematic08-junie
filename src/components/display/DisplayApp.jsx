/**
 * Display App Component
 * Large display panel for showing current queue status and calls
 */

import { useState, useEffect, useRef } from 'react';
import DatabaseService from '../../services/DatabaseService.js';
import AuthService from '../../services/AuthService.js';
import AppConfig from '../../config/AppConfig.js';
import Logger from '../../utils/Logger.js';
import LayoutManager from '../../utils/LayoutManager.js';
import Queue from '../../models/Queue.js';
import Arrow from './Arrow.jsx';
import './DisplayApp.css';

const DisplayApp = () => {
  const [currentUser] = useState(AuthService.getCurrentUser());
  const [displayData, setDisplayData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const displayContainerRef = useRef(null);

  const refreshInterval = AppConfig.get('refreshIntervals.displayPanel');

  useEffect(() => {
    if (currentUser?.branchId) {
      loadDisplayData();
      
      // Set up auto-refresh for display data
      const displayInterval = setInterval(() => {
        loadDisplayData();
      }, refreshInterval);

      // Update time every second
      const timeInterval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => {
        clearInterval(displayInterval);
        clearInterval(timeInterval);
      };
    }
  }, [currentUser, refreshInterval]);

  // Apply layout when component mounts and when layout changes
  useEffect(() => {
    const applyLayout = () => {
      if (displayContainerRef.current) {
        LayoutManager.applyLayoutToComponent(displayContainerRef.current, {
          useContentHeight: true,
          additionalOffset: 0
        });
      }
    };

    // Apply initial layout
    applyLayout();

    // Register for layout change notifications
    LayoutManager.addObserver('displayApp', (event, data) => {
      if (event === 'layoutRecalculated' || event === 'navigationResize') {
        applyLayout();
        Logger.debug('DisplayApp layout updated', data);
      }
    });

    return () => {
      LayoutManager.removeObserver('displayApp');
    };
  }, []);

  /**
   * Load display data for the current branch
   */
  const loadDisplayData = async () => {
    if (!currentUser?.branchId) return;

    try {
      const data = await DatabaseService.getDisplayData(currentUser.branchId);
      setDisplayData({
        ...data,
        currentlyServing: data.currentlyServing?.map(q => Queue.fromAPI(q)) || [],
        waitingQueue: data.waitingQueue?.map(q => Queue.fromAPI(q)) || [],
        lastCalled: data.lastCalled ? Queue.fromAPI(data.lastCalled) : null
      });
      
      setError('');
      setIsLoading(false);
      Logger.debug('Display data loaded:', data);
    } catch (error) {
      Logger.error('Error loading display data:', error);
      setError('Görüntü verileri yüklenirken hata oluştu');
      setIsLoading(false);
    }
  };

  /**
   * Get formatted time string
   * @returns {string} Formatted time
   */
  const getFormattedTime = () => {
    return currentTime.toLocaleString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  /**
   * Get status color for queue item
   * @param {Queue} queue - Queue item
   * @returns {string} Status color class
   */
  const getStatusColorClass = (queue) => {
    switch (queue.status) {
      case 'called':
        return 'status-called';
      case 'serving':
        return 'status-serving';
      default:
        return 'status-waiting';
    }
  };

  if (!currentUser) {
    return (
      <div className="display-app">
        <div className="display-error">
          <h1>Sistem Hatası</h1>
          <p>Kullanıcı bilgisi bulunamadı</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="display-app">
        <div className="display-loading">
          <div className="loading-spinner"></div>
          <h1>Yükleniyor...</h1>
          <p>Sıra bilgileri getiriliyor</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="display-app">
        <div className="display-error">
          <h1>Bağlantı Hatası</h1>
          <p>{error}</p>
          <p className="error-retry">Sistem otomatik olarak yeniden deniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="display-app">
      <div className="display-container" ref={displayContainerRef}>
        {/* Header */}
        <div className="display-header">
          <div className="header-left">
            <h1 className="branch-name">{currentUser.branchName}</h1>
            <p className="system-title">Sıramatik Sistemi</p>
          </div>
          <div className="header-right">
            <div className="current-time">{getFormattedTime()}</div>
          </div>
        </div>

        {/* Main Display Area */}
        <div className="main-display">
          {/* Currently Being Served */}
          <div className="currently-serving-section">

            {displayData?.currentlyServing?.length > 0 ? (
              <div className="serving-grid">
                {displayData.currentlyServing.map((queue) => {
                  const arrowConfig = AppConfig.get('display.arrow') || {};
                  const showArrow = arrowConfig.enabled !== false;
                  
                  return (
                    <div key={queue.id} className={`serving-item ${getStatusColorClass(queue)}`}>
                      <div className="serving-content">
                        <div className="serving-number">
                          <span className="number-label">Sıra No</span>
                          <span className="number-value">{queue.queueNumber}</span>
                        </div>
                        
                        {showArrow && (
                          <Arrow 
                            animated={arrowConfig.animated}
                            color={arrowConfig.color}
                            size={arrowConfig.size}
                            className="queue-to-counter-arrow"
                          />
                        )}
                        
                        <div className="serving-counter">
                          <span className="counter-label">Gişe</span>
                          <span className="counter-value">{queue.counterNumber}</span>
                        </div>
                      </div>
                      
                      <div className="serving-status">
                        <span className="status-text">{queue.getStatusText()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-serving">
                <span className="no-serving-icon">⏸️</span>
                <p>Şu anda hizmet verilmiyor</p>
              </div>
            )}
          </div>

          {/* Last Called */}
          {displayData?.lastCalled && (
            <div className="last-called-section">
              <h2 className="section-title">Son Çağrılan Sıra No</h2>
              <div className="last-called-display">
                <div className="last-called-number">
                  <span className="last-called-value">{displayData.lastCalled.queueNumber}</span>
                </div>
                <div className="last-called-time">
                  {displayData.lastCalled.getFormattedCalledAt()}
                </div>
              </div>
            </div>
          )}

          {/* Waiting Queue */}
          <div className="waiting-queue-section">
            <h2 className="section-title">
              Bekleyen Sıralar ({displayData?.waitingQueue?.length || 0})
            </h2>
            
            {displayData?.waitingQueue?.length > 0 ? (
              <div className="waiting-queue-grid">
                {displayData.waitingQueue.slice(0, 20).map((queue) => (
                  <div key={queue.id} className="waiting-item">
                    <span className="waiting-number">{queue.queueNumber}</span>
                    <span className="waiting-time">
                      {queue.getFormattedWaitingTime()}
                    </span>
                  </div>
                ))}
                {displayData.waitingQueue.length > 20 && (
                  <div className="waiting-more">
                    <span className="more-count">+{displayData.waitingQueue.length - 20}</span>
                    <span className="more-text">daha</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-waiting">
                <span className="no-waiting-icon">✅</span>
                <p>Bekleyen müşteri yok</p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="statistics-bar">
          <div className="stat-item">
            <span className="stat-label">Aktif Gişe</span>
            <span className="stat-value">{displayData?.activeCounters || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Hizmet Veriliyor</span>
            <span className="stat-value">{displayData?.currentlyServing?.length || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Bekleyen</span>
            <span className="stat-value">{displayData?.waitingQueue?.length || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Bugün Tamamlanan</span>
            <span className="stat-value">{displayData?.completedToday || 0}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="display-footer">
          <div className="footer-left">
            <span className="refresh-info">
              🔄 Otomatik yenileme: {Math.floor(refreshInterval / 1000)} saniye
            </span>
          </div>
          <div className="footer-right">
            <span className="system-info">
              Queuematic Sistemi v1.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisplayApp;