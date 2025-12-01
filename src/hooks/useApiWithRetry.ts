import { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
}

interface ApiError {
  message: string;
  isNetworkError: boolean;
  isServerError: boolean;
  isBackendUnreachable: boolean;
  statusCode?: number;
}

const defaultConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

export function parseApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    
    // Network error - backend unreachable
    if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
      return {
        message: 'Unable to connect to the server. Please check if the backend is running and try again.',
        isNetworkError: true,
        isServerError: false,
        isBackendUnreachable: true,
      };
    }
    
    // Server errors (5xx)
    if (axiosError.response?.status && axiosError.response.status >= 500) {
      return {
        message: 'Server error. Please try again in a moment.',
        isNetworkError: false,
        isServerError: true,
        isBackendUnreachable: false,
        statusCode: axiosError.response.status,
      };
    }
    
    // Client errors (4xx) - don't retry these
    if (axiosError.response?.status && axiosError.response.status >= 400) {
      return {
        message: axiosError.response.data?.message || 'Request failed. Please check your input.',
        isNetworkError: false,
        isServerError: false,
        isBackendUnreachable: false,
        statusCode: axiosError.response.status,
      };
    }
  }
  
  // Generic error
  return {
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    isNetworkError: false,
    isServerError: false,
    isBackendUnreachable: false,
  };
}

export function useApiWithRetry(config: RetryConfig = {}) {
  const { maxRetries, retryDelay, backoffMultiplier } = { ...defaultConfig, ...config };
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const executeWithRetry = useCallback(async <T>(
    apiCall: () => Promise<T>,
    onRetry?: (attempt: number, maxAttempts: number) => void
  ): Promise<T> => {
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries!; attempt++) {
      try {
        if (attempt > 0) {
          setIsRetrying(true);
          setRetryCount(attempt);
          onRetry?.(attempt, maxRetries!);
          
          // Exponential backoff
          const delay = retryDelay! * Math.pow(backoffMultiplier!, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const result = await apiCall();
        setIsRetrying(false);
        setRetryCount(0);
        return result;
      } catch (error) {
        lastError = error;
        const parsedError = parseApiError(error);
        
        // Don't retry client errors (4xx) - these won't succeed on retry
        if (!parsedError.isNetworkError && !parsedError.isServerError) {
          setIsRetrying(false);
          setRetryCount(0);
          throw error;
        }
        
        // If this was the last attempt, throw
        if (attempt === maxRetries) {
          setIsRetrying(false);
          setRetryCount(0);
          throw error;
        }
      }
    }
    
    throw lastError;
  }, [maxRetries, retryDelay, backoffMultiplier]);

  return {
    executeWithRetry,
    retryCount,
    isRetrying,
    parseError: parseApiError,
  };
}
