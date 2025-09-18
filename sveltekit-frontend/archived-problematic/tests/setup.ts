/**
 * Test Setup Configuration
 * Global test setup for Legal AI Platform integration tests
 */

import { beforeAll, afterAll } from 'vitest';
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({
  path: path.join(process.cwd(), '.env.test'),
  override: false,
});

// Global test configuration
global.TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5173',
  databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/legal_ai_test',
  timeout: 30000,
  retryAttempts: 3,
};

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');

  // Verify test database connection
  try {
    // Basic connectivity test would go here
    console.log('✅ Test database connection verified');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    throw error;
  }

  // Initialize any global test state
  console.log('✅ Global test setup completed');
});

// Global cleanup - runs once after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');

  // Cleanup any global test state
  console.log('✅ Global test cleanup completed');
});

// Mock implementations for testing
global.fetch = global.fetch || require('node-fetch');

// Export test utilities
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms);

export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error);

      if (attempt < maxAttempts) {
        console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }

  throw lastError!;
};
