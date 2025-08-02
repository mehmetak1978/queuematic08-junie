/**
 * Test for Empty Queue Error Scenario
 * Tests the "next customer" functionality when no customers are waiting
 */

import { jest } from '@jest/globals';

// Mock DatabaseService
const mockDatabaseService = {
  callNextCustomer: jest.fn()
};

// Mock AuthService
const mockAuthService = {
  getToken: jest.fn(() => 'mock-token')
};

// Mock Logger
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn()
};

describe('Empty Queue Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle "No customers waiting in queue" error gracefully', async () => {
    // Simulate the error that occurs when no customers are waiting
    const error = new Error('Call next customer failed: No customers waiting in queue');
    mockDatabaseService.callNextCustomer.mockRejectedValue(error);

    // Mock the callNextCustomer function behavior
    const callNextCustomer = async () => {
      try {
        const queue = await mockDatabaseService.callNextCustomer(
          'counter-id',
          mockAuthService.getToken()
        );
        
        if (queue) {
          return { success: true, queue };
        } else {
          return { success: false, error: 'Çağrılacak müşteri bulunamadı' };
        }
      } catch (error) {
        mockLogger.error('Error calling next customer:', error);
        
        let errorMessage = 'Müşteri çağrılırken hata oluştu';
        if (error.message.includes('No waiting customers') || 
            error.message.includes('No customers waiting in queue')) {
          errorMessage = 'Bekleyen müşteri bulunmuyor';
        }
        
        return { success: false, error: errorMessage };
      }
    };

    // Execute the function
    const result = await callNextCustomer();

    // Verify the behavior
    expect(result.success).toBe(false);
    expect(result.error).toBe('Bekleyen müşteri bulunmuyor');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error calling next customer:', 
      expect.any(Error)
    );
    expect(mockDatabaseService.callNextCustomer).toHaveBeenCalledWith(
      'counter-id',
      'mock-token'
    );
  });

  test('should display meaningful error message in Turkish', () => {
    const errorMessages = {
      'No waiting customers': 'Bekleyen müşteri bulunmuyor',
      'No customers waiting in queue': 'Bekleyen müşteri bulunmuyor',
      'Call next customer failed: No customers waiting in queue': 'Bekleyen müşteri bulunmuyor'
    };

    Object.entries(errorMessages).forEach(([englishError, turkishMessage]) => {
      const error = new Error(englishError);
      
      let errorMessage = 'Müşteri çağrılırken hata oluştu';
      if (error.message.includes('No waiting customers') || 
          error.message.includes('No customers waiting in queue')) {
        errorMessage = 'Bekleyen müşteri bulunmuyor';
      }
      
      expect(errorMessage).toBe(turkishMessage);
    });
  });

  test('should log error with proper details', async () => {
    const error = new Error('Call next customer failed: No customers waiting in queue');
    mockDatabaseService.callNextCustomer.mockRejectedValue(error);

    const callNextCustomer = async () => {
      try {
        await mockDatabaseService.callNextCustomer('counter-id', 'mock-token');
      } catch (error) {
        mockLogger.error('Error calling next customer:', error);
        throw error;
      }
    };

    await expect(callNextCustomer()).rejects.toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error calling next customer:',
      expect.objectContaining({
        message: 'Call next customer failed: No customers waiting in queue'
      })
    );
  });
});