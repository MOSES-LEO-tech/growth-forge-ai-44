export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromSupabase(error: { message: string; code?: string }, status = 500): ApiError {
    const code = error.code || 'UNKNOWN';
    let message = error.message;
    let httpStatus = status;

    if (code === 'PGRST116') {
      message = 'Resource not found';
      httpStatus = 404;
    } else if (code === '42501') {
      message = 'Permission denied';
      httpStatus = 403;
    } else if (error.message?.toLowerCase().includes('network')) {
      message = 'Network error. Please check your connection.';
      httpStatus = 0;
    }

    return new ApiError(message, code, httpStatus, error);
  }

  static network(): ApiError {
    return new ApiError(
      'Network unavailable. Some features may be limited.',
      'NETWORK_ERROR',
      0
    );
  }

  static timeout(): ApiError {
    return new ApiError(
      'Request timed out. Please try again.',
      'TIMEOUT',
      408
    );
  }

  static unauthorized(): ApiError {
    return new ApiError(
      'Session expired. Please sign in again.',
      'UNAUTHORIZED',
      401
    );
  }

  static forbidden(): ApiError {
    return new ApiError(
      'You do not have permission to perform this action.',
      'FORBIDDEN',
      403
    );
  }

  static notFound(resource = 'Resource'): ApiError {
    return new ApiError(
      `${resource} not found.`,
      'NOT_FOUND',
      404
    );
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get userMessage(): string {
    if (this.isNetworkError) {
      return 'Network unavailable. Changes will be saved when reconnected.';
    }
    if (this.isAuthError) {
      return 'Please sign in again to continue.';
    }
    return this.message;
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) return error.isNetworkError;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('network') || msg.includes('fetch') || msg.includes('connection');
  }
  return false;
}

export function handleApiError(error: unknown): { message: string; isRetryable: boolean } {
  if (error instanceof ApiError) {
    return {
      message: error.userMessage,
      isRetryable: error.isNetworkError || error.status >= 500,
    };
  }

  if (error instanceof Error) {
    if (isNetworkError(error)) {
      return { message: 'Network error. Please check your connection.', isRetryable: true };
    }
    return { message: error.message, isRetryable: false };
  }

  return { message: 'An unexpected error occurred.', isRetryable: false };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 2 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (isNetworkError(error)) {
        if (attempt < retries) {
          const waitTime = delay * Math.pow(backoff, attempt);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
      }
      throw error;
    }
  }
  
  throw lastError;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): { (...args: Parameters<T>): void; cancel(): void } {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
  
  debounced.cancel = () => clearTimeout(timeoutId);
  
  return debounced;
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): { (...args: Parameters<T>): void; cancel(): void } {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = limit - (now - lastCall);
    
    if (remaining <= 0) {
      lastCall = now;
      fn(...args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
      }, remaining);
    }
  };
  
  throttled.cancel = () => clearTimeout(timeoutId);
  
  return throttled;
}