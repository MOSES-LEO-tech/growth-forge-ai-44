// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.console = {
    ...console,
    // Suppress console logs during tests unless there's an error
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error, // Keep error logs
};
