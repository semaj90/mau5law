// src/lib/services/__tests__/integration-setup.ts
import { beforeAll, afterAll, vi } from 'vitest';
// Integration test setup for real network testing
beforeAll(async () => {
  console.log('🚀 Setting up integration test environment...');
  // Check if development services are running
  const services = [
    { name: 'Legal Gateway', url: 'http://localhost:8080/health' },
    { name: 'Auth Service', url: 'http://localhost:8081/health' },
    { name: 'Session Service', url: 'http://localhost:8082/health' },
    { name: 'Canvas Service', url: 'http://localhost:8083/health' },
    { name: 'Database', url: 'http://localhost:5432' }
  ];
  console.log('\n📡 Checking service availability:');
  for (const service of services) {
    try {
      const response = await fetch(service.url, {
        method: 'GET',
        timeout: 2000,
      )});
      if (response.ok) {
        console.log(`   ✅ ${service.name} - Available`);
      } else {
        console.log(`   ⚠️  ${service.name} - Responding but not healthy (${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ ${service.name} - Unavailable (${error.message})`);
    }
  }
  console.log('\n📊 Integration test configuration:');
  console.log('   • Real HTTP requests to microservices');
  console.log('   • WebSocket connections for real-time features');
  console.log('   • Performance baseline measurement for gRPC comparison');
  console.log('   • Graceful degradation when services unavailable');
  console.log('   • Network timeout and error handling validation\n');
});
afterAll(async () => {
  console.log('\n🧹 Integration test cleanup completed');
});
// Global test utilities for integration tests
global.integrationTestConfig = {
  baseUrl: 'http://localhost:8080',
  timeout: 5000,
  retries: 2,
  skipOnServiceUnavailable: true
}
// Mock only unavailable external services, not internal ones
vi.mock('external-payment-service', () => ({
  processPayment: vi.fn().mockResolvedValue({ success: true, transactionId: 'mock-tx-123' })
});
vi.mock('external-email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'mock-email-123' })
});