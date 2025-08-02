/**
 * Clerk App Component
 * Interface for clerks to manage counters, call customers, and handle services
 */

import { useState, useEffect } from 'react';
import DatabaseService from '../../services/DatabaseService.js';
import AuthService from '../../services/AuthService.js';
import AppConfig from '../../config/AppConfig.js';
import Logger from '../../utils/Logger.js';
import Counter from '../../models/Counter.js';
import Queue from '../../models/Queue.js';
import ErrorNotification from '../common/ErrorNotification.jsx';
import './ClerkApp.css';

const ClerkApp = () => {
  const [currentUser] = useState(AuthService.getCurrentUser());
  const [availableCounters, setAvailableCounters] = useState([]);
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [currentQueue, setCurrentQueue] = useState(null);
  const [workHistory, setWorkHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);

  /**
   * Clear error message
   */
  const clearError = () => {
    setError('');
  };

  const refreshInterval = AppConfig.get('refreshIntervals.clerkApp');

  useEffect(() => {
    if (currentUser?.branchId) {
      // Initialize app with priority: active session → last used counter → manual selection
      const initializeApp = async () => {
        // First check if user has an active session
        const hasActiveSession = await checkActiveSession();
        
        if (!hasActiveSession) {
          // If no active session, check for last used counter
          const hasLastUsedCounter = await checkLastUsedCounter();
          
          // Only load available counters for manual selection if no active session and no last used counter
          if (!hasLastUsedCounter) {
            loadAvailableCounters();
          }
        }
        
        // Always load work history
        loadWorkHistory();
      };
      
      initializeApp();
    }
  }, [currentUser]);

  // Separate useEffect for auto-refresh to prevent infinite loop
  useEffect(() => {
    if (!currentUser?.branchId) return;
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      if (selectedCounter) {
        loadWorkHistory();
      } else {
        loadAvailableCounters();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [selectedCounter, refreshInterval, currentUser]);

  /**
   * Load available counters for the current branch
   */
  const loadAvailableCounters = async () => {
    if (!currentUser?.branchId) return;

    try {
      const counters = await DatabaseService.getAvailableCounters(
        currentUser.branchId, 
        AuthService.getToken()
      );
      
      // Defensive programming: ensure counters is an array before calling map
      if (Array.isArray(counters)) {
        setAvailableCounters(counters.map(c => Counter.fromAPI(c)));
        Logger.debug('Available counters loaded:', counters);
      } else {
        Logger.warning('Invalid counters data received:', counters);
        setAvailableCounters([]);
        setError('Müsait gişeler yüklenirken hata oluştu');
      }
    } catch (error) {
      Logger.error('Error loading available counters:', error);
      setAvailableCounters([]); // Set empty array to prevent further errors
      setError('Müsait gişeler yüklenirken hata oluştu');
    }
  };

  /**
   * Load work history for the current user
   */
  const loadWorkHistory = async () => {
    if (!currentUser?.id) return;

    try {
      const response = await DatabaseService.getWorkHistory(
        currentUser.id,
        AuthService.getToken()
      );
      
      // Extract history array from API response structure
      const historyArray = response?.data?.history;
      
      // Defensive programming: ensure history is an array before calling map
      if (Array.isArray(historyArray)) {
        setWorkHistory(historyArray.map(h => Queue.fromAPI(h)));
        Logger.debug('Work history loaded:', historyArray);
      } else {
        Logger.warning('Invalid work history data structure received:', response);
        setWorkHistory([]);
      }
    } catch (error) {
      Logger.error('Error loading work history:', error);
      setWorkHistory([]); // Set empty array to prevent map errors
      // Don't show error for work history as it's not critical
    }
  };

  /**
   * Check if user has an active counter session and restore it
   */
  const checkActiveSession = async () => {
    if (!currentUser?.id) return false;

    try {
      const activeSession = await DatabaseService.getCurrentUserSession(
        AuthService.getToken()
      );
      
      if (activeSession) {
        // User has an active session, restore it
        const counter = new Counter({
          id: activeSession.counterId,
          number: activeSession.counterNumber,
          isActive: true
        });
        
        setSelectedCounter(counter);
        setSessionId(activeSession.sessionId);
        
        // If there's a current queue item, restore it too
        if (activeSession.currentQueue) {
          setCurrentQueue(Queue.fromAPI(activeSession.currentQueue));
        }
        
        Logger.info('Active session restored:', {
          counterId: activeSession.counterId,
          counterNumber: activeSession.counterNumber,
          sessionId: activeSession.sessionId
        });
        
        return true; // Session was restored
      }
      
      return false; // No active session
    } catch (error) {
      Logger.error('Error checking active session:', error);
      // Don't show error to user, just continue with normal flow
      return false;
    }
  };

  /**
   * Check if user has a last used counter and automatically select it if available
   */
  const checkLastUsedCounter = async () => {
    if (!currentUser?.id) return false;

    try {
      const lastUsedCounter = await DatabaseService.getLastUsedCounter(
        AuthService.getToken()
      );
      
      if (lastUsedCounter) {
        // User has a last used counter that's available, automatically select it
        const counter = new Counter({
          id: lastUsedCounter.counterId,
          number: lastUsedCounter.counterNumber,
          isActive: true
        });
        
        Logger.info('Auto-selecting last used counter:', {
          counterId: lastUsedCounter.counterId,
          counterNumber: lastUsedCounter.counterNumber,
          lastUsed: lastUsedCounter.lastUsed
        });
        
        // Automatically start session with the last used counter
        await startCounterSession(counter);
        
        return true; // Counter was auto-selected
      }
      
      return false; // No last used counter available
    } catch (error) {
      Logger.error('Error checking last used counter:', error);
      // Don't show error to user, just continue with normal flow
      return false;
    }
  };

  /**
   * Start working at a counter
   * @param {Counter} counter - Selected counter
   */
  const startCounterSession = async (counter) => {
    setIsLoading(true);
    setError('');

    try {
      const session = await DatabaseService.startCounterSession(
        counter.id,
        AuthService.getToken()
      );
      
      setSelectedCounter(counter);
      setSessionId(session.id);
      
      Logger.info(`Started session at counter ${counter.counterNumber}`);
    } catch (error) {
      Logger.error('Error starting counter session:', error);
      
      let errorMessage = 'Gişe oturumu başlatılırken hata oluştu';
      if (error.message.includes('Counter already occupied')) {
        errorMessage = 'Bu gişe başka bir görevli tarafından kullanılıyor';
      } else if (error.message.includes('User already has an active counter session')) {
        errorMessage = 'Zaten aktif bir gişe oturumunuz var';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Call next customer
   */
  const callNextCustomer = async () => {
    if (!selectedCounter) return;

    setIsLoading(true);
    setError('');

    try {
      const queue = await DatabaseService.callNextCustomer(
        selectedCounter.id,
        AuthService.getToken()
      );
      
      if (queue) {
        setCurrentQueue(Queue.fromAPI(queue));
        Logger.info('Next customer called:', queue);
      } else {
        setCurrentQueue(null);
        setError('Çağrılacak müşteri bulunamadı');
      }
    } catch (error) {
      Logger.error('Error calling next customer:', error);
      
      let errorMessage = 'Müşteri çağrılırken hata oluştu';
      if (error.message.includes('No waiting customers')) {
        errorMessage = 'Bekleyen müşteri bulunmuyor';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Complete current service
   */
  const completeService = async () => {
    if (!currentQueue) {
      Logger.warning('Cannot complete service: no current queue');
      setError('Tamamlanacak hizmet bulunamadı');
      return;
    }

    if (!currentQueue.id) {
      Logger.error('Cannot complete service: queue ID is missing', currentQueue);
      setError('Sıra ID\'si bulunamadı. Lütfen müşteriyi tekrar çağırın.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await DatabaseService.completeService(
        currentQueue.id,
        AuthService.getToken()
      );
      
      setCurrentQueue(null);
      await loadWorkHistory();
      
      Logger.info('Service completed for queue:', currentQueue.id);
    } catch (error) {
      Logger.error('Error completing service:', error);
      
      let errorMessage = 'Hizmet tamamlanırken hata oluştu';
      if (error.message.includes('Queue ID is required')) {
        errorMessage = 'Sıra ID\'si gerekli. Lütfen müşteriyi tekrar çağırın.';
      } else if (error.message.includes('Queue not found')) {
        errorMessage = 'Sıra bulunamadı. Müşteri zaten işlem görmüş olabilir.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * End counter session
   */
  const endCounterSession = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError('');

    try {
      await DatabaseService.endCounterSession(
        sessionId,
        AuthService.getToken()
      );
      
      setSelectedCounter(null);
      setSessionId(null);
      setCurrentQueue(null);
      await loadAvailableCounters();
      
      Logger.info('Counter session ended');
    } catch (error) {
      Logger.error('Error ending counter session:', error);
      setError('Gişe oturumu sonlandırılırken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="clerk-app">
        <div className="error-message">
          Kullanıcı bilgisi bulunamadı
        </div>
      </div>
    );
  }

  return (
    <div className="clerk-app">
      <div className="clerk-container">
        {/* Header */}
        <div className="clerk-header">
          <h1 className="clerk-title">Gişe Yönetimi</h1>
          <p className="clerk-subtitle">{currentUser.branchName}</p>
          <p className="clerk-user">Hoş geldiniz, {currentUser.getDisplayName()}</p>
        </div>

        <ErrorNotification 
          error={error}
          onClose={clearError}
          type="warning"
          autoClose={true}
          autoCloseDelay={6000}
        />

        {/* Counter Selection */}
        {!selectedCounter && (
          <div className="counter-selection-section">
            <h2 className="section-title">Gişe Seçimi</h2>
            
            {availableCounters.length === 0 ? (
              <div className="no-counters">
                <span className="no-counters-icon">🚫</span>
                <p>Şu anda müsait gişe bulunmuyor</p>
                <p className="no-counters-subtitle">
                  Lütfen daha sonra tekrar deneyin
                </p>
              </div>
            ) : (
              <div className="counters-grid">
                {availableCounters.map((counter) => (
                  <div key={counter.id} className="counter-card">
                    <div className="counter-info">
                      <h3 className="counter-name">{counter.getDisplayName()}</h3>
                      <p className="counter-status">{counter.getStatusText()}</p>
                    </div>
                    <button
                      onClick={() => startCounterSession(counter)}
                      disabled={isLoading}
                      className="select-counter-button"
                    >
                      {isLoading ? 'Seçiliyor...' : 'Bu Gişeyi Seç'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Counter Session */}
        {selectedCounter && (
          <div className="active-session-section">
            <div className="session-header">
              <h2 className="section-title">
                Aktif Gişe: {selectedCounter.getDisplayName()}
              </h2>
              <button
                onClick={endCounterSession}
                disabled={isLoading}
                className="end-session-button"
              >
                Gişeyi Kapat
              </button>
            </div>

            {/* Current Customer */}
            <div className="current-customer-section">
              <h3 className="subsection-title">Mevcut Müşteri</h3>
              
              {currentQueue ? (
                <div className="current-customer-card">
                  <div className="customer-number">
                    <span className="customer-number-label">Sıra No:</span>
                    <span className="customer-number-value">{currentQueue.queueNumber}</span>
                  </div>
                  <div className="customer-info">
                    <div className="customer-detail">
                      <span className="detail-label">Durum:</span>
                      <span className={`detail-value status-${currentQueue.status}`}>
                        {currentQueue.getStatusText()}
                      </span>
                    </div>
                    <div className="customer-detail">
                      <span className="detail-label">Çağrıldı:</span>
                      <span className="detail-value">
                        {currentQueue.getFormattedCalledAt()}
                      </span>
                    </div>
                    <div className="customer-detail">
                      <span className="detail-label">Hizmet Süresi:</span>
                      <span className="detail-value">
                        {currentQueue.getFormattedServiceTime()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={completeService}
                    disabled={isLoading}
                    className="complete-service-button"
                  >
                    {isLoading ? 'Tamamlanıyor...' : 'Hizmeti Tamamla'}
                  </button>
                </div>
              ) : (
                <div className="no-customer">
                  <span className="no-customer-icon">👤</span>
                  <p>Şu anda hizmet verilen müşteri yok</p>
                  <button
                    onClick={callNextCustomer}
                    disabled={isLoading}
                    className="call-next-button"
                  >
                    {isLoading ? 'Çağrılıyor...' : 'Sıradaki Müşteriyi Çağır'}
                  </button>
                </div>
              )}
            </div>

            {/* Work History */}
            <div className="work-history-section">
              <h3 className="subsection-title">Bugünkü İşler</h3>
              
              {workHistory.length === 0 ? (
                <div className="no-history">
                  <span className="no-history-icon">📋</span>
                  <p>Henüz tamamlanan iş bulunmuyor</p>
                </div>
              ) : (
                <div className="history-list">
                  {workHistory.slice(0, 10).map((queue) => (
                    <div key={queue.id} className="history-item">
                      <div className="history-number">
                        <span className="history-number-value">{queue.queueNumber}</span>
                      </div>
                      <div className="history-details">
                        <div className="history-time">
                          <span className="history-label">Tamamlandı:</span>
                          <span className="history-value">
                            {queue.getFormattedCompletedAt()}
                          </span>
                        </div>
                        <div className="history-duration">
                          <span className="history-label">Süre:</span>
                          <span className="history-value">
                            {queue.getFormattedServiceTime()}
                          </span>
                        </div>
                      </div>
                      <div className={`history-status status-${queue.status}`}>
                        {queue.getStatusText()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics */}
        {selectedCounter && workHistory.length > 0 && (
          <div className="statistics-section">
            <h3 className="subsection-title">Günlük İstatistikler</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{workHistory.length}</span>
                <span className="stat-label">Tamamlanan İş</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {Math.round(workHistory.reduce((sum, q) => sum + q.getServiceTime(), 0) / workHistory.length)}dk
                </span>
                <span className="stat-label">Ortalama Süre</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {Math.round(workHistory.reduce((sum, q) => sum + q.getServiceTime(), 0))}dk
                </span>
                <span className="stat-label">Toplam Süre</span>
              </div>
            </div>
          </div>
        )}

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

export default ClerkApp;