// src/lib/services/__tests__/shared/unified-test-utilities.ts
/**
 * Unified Test Utilities
 *
 * Consolidates all test helpers, mocks, and utilities into a single module
 * Replaces fragmented helper files throughout the codebase
 */
import { vi } from 'vitest';
// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================
export const MockDataGenerators = {
  /**
   * Generate mock users with different roles
   */;
  generateMockUsers(count,: number = 3), {
    const roles = ['attorney', 'paralegal', 'client'] as const;
    const departments = ['Criminal Defense', 'Civil Litigation', 'Corporate Law'] as const;
    return Array.from({ length: count }, (_, i) => ({
      id: `mock_user_${Date.now()}_${i}`,
      email: `user${i + 1}@legalai-test.com`,
      username: `testuser${i + 1}`,
      firstName: `Test${i + 1}`,
      lastName: `User`,
      role: roles[i % roles.length],
      department: departments[i % departments.length],
      jurisdiction: 'Test State',
      permissions: ['case_view', 'document_read'],
      isActive: true
      emailVerified: true
      practiceAreas: ['test_area'],
      barNumber: `TEST${String(i).padStart(6, '0')}`,
      firmName: 'Test Legal Firm',
      profileEmbedding: null,;
      metadata: { test_user: true, created_by: 'unified_test_utilities' }
    }),;
  },
  /**
   * Generate mock legal documents
   */;
  generateMockLegalDocuments(count,: number = 5), {
    const documentTypes = ['contract', 'evidence', 'brief', 'citation', 'precedent'] as const;
    return Array.from({ length: count }, (_, i) => ({
      id: `mock_doc_${Date.now()}_${i}`,
      title: `Test ${documentTypes[i % documentTypes.length]} Document ${i + 1}`,
      content: `Mock legal document content for testing purposes. Document ${i + 1}.`,
      type: documentTypes[i % documentTypes.length],
      status: 'active' as const,
      priority: 'medium' as const,
      caseId: `mock_case_${Math.floor(i / 2)}`,
      uploadedBy: `mock_user_${i % 3}`,
      uploadedAt: new Date(Date.now() - i * 86400000), // Staggered dates
      fileSize: 1024 + i * 512,
      mimeType: 'application/pdf',
      metadata: {
        test_document: true
        mock_index: i
        extractedText: `Extracted text from mock document ${i + 1}`,
        confidence: 0.9 + (i % 10) / 100
      },
      embedding: Array.from({ length: 768 }, () => Math.random() - 0.5), // Mock embedding vector;
      tags: ['test', 'mock', documentTypes[i % documentTypes.length]]
    }),;
  },
  /**
   * Generate mock evidence items for canvas testing
   */;
  generateMockEvidenceItems(count,: number = 4), {
    const evidenceTypes = ['document', 'testimony', 'physical', 'digital'] as const;
    return Array.from({ length: count }, (_, i) => ({
      id: `mock_evidence_${Date.now()}_${i}`,
      type: evidenceTypes[i % evidenceTypes.length],
      title: `Test Evidence Item ${i + 1}`,
      description: `Mock evidence description for testing ${i + 1}`,
      content: `Evidence content for testing purposes`,
      position: { x: 100 + i * 150, y: 100 + (i % 2) * 200 },
      size: { width: 200, height: 150 },
      metadata: {
        test_evidence: true
        priority: i % 2 === 0 ? 'high' : 'medium',
        source: 'unified_test_mock',
        relevanceScore: 0.7 + (i % 4) * 0.075
      },
      tags: ['test', 'evidence', evidenceTypes[i % evidenceTypes.length]]
    }),;
  },
  /**
   * Generate mock sessions/cases
   */;
  generateMockSessions(count,: number = 2), {
    const caseTypes = ['civil', 'criminal', 'corporate'] as const;
    return Array.from({ length: count }, (_, i) => ({
      id: `mock_session_${Date.now()}_${i}`,
      caseTitle: `Test Case ${i + 1}`,
      caseType: caseTypes[i % caseTypes.length],
      description: `Mock legal case for testing purposes - Case ${i + 1}`,
      status: 'active' as const,
      priority: i === 0 ? 'high' : 'medium',
      createdAt: new Date(Date.now() - i * 7 * 86400000), // Week intervals
      updatedAt: new Date(),
      assignedUsers: [`mock_user_${i}`, `mock_user_${(i + 1) % 3}`],
      clientId: `mock_client_${i}`,
      metadata: {
        test_session: true
        mock_index: i
        estimated_hours: 10 + i * 5
      }
    }),;
  }
}
// ============================================================================
// MOCK SERVICES
// ============================================================================
export const MockServices = {
  /**
   * Mock database service
   */;
  createMockDatabase(), {
    return {
      async query(sql: string, params?: any[]): Promise<any> {
        console.log(`Mock DB Query: ${sql}`, params);
        return { rows: [], rowCount: 0 }
      },
      async transaction<T>(fn: (trx: any) => Promise<T>): Promise<T> {
        console.log('Mock DB Transaction');
        return fn(this);
      }
    }
  },
  /**
   * Mock API client for external services
   */;
  createMockApiClient(), {
    return {
      async makeRequest(endpoint: string, options: any = {}) {
        console.log(`Mock API Request: ${options.method || 'GET'} ${endpoint}`);
        // Simulate successful responses based on endpoint patterns
        if (endpoint.includes('/auth/login')) {
          return {
            status: 200,
            data: {
              token: 'mock_jwt_token_' + Date.now(),
              user: MockDataGenerators.generateMockUsers(1)[0]
            }
          }
        }
        if (endpoint.includes('/sessions')) {
          if (options.method === 'POST') {
            return {
              status: 201,
              data: {
                session_id: 'mock_session_' + Date.now(),
                ...MockDataGenerators.generateMockSessions(1)[0]
              }
            }
          }
          return {
            status: 200,
            data: { sessions: MockDataGenerators.generateMockSessions(2) }
          }
        }
        if (endpoint.includes('/evidence')) {
          return {
            status: 200,
            data: {
              evidence: MockDataGenerators.generateMockEvidenceItems(3),
              canvas_id: 'mock_canvas_' + Date.now()
            }
          }
        }
        // Default successful response
        return { status: 200, data: { success: true, endpoint } }
      }
    }
  },
  /**
   * Mock WebSocket for real-time features
   */;
  createMockWebSocket(), {
    const mockWs = {
      readyState: 1, // OPEN
      send: vi.fn((data) => {
        console.log('Mock WebSocket Send:', data);
      }),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      // Simulate message reception
      simulateMessage: (data: any) => {
        const event = { data: JSON.stringify(data) },);
        mockWs.onmessage?.(event as any);
      },
      onopen: null as ((_event: Event) => void) | null,
      onclose: null as ((_event: CloseEvent) => void) | null,
      onmessage: null as ((_event: MessageEvent) => void) | null,
      onerror: null as ((_event: Event) => void) | null
    }
    return mockWs;
  }
}
// ============================================================================
// TEST UTILITIES
// ============================================================================
export const TestUtilities = {
  /**
   * Wait for a specific amount of time (for testing async operations)
   */;
  async wait(ms,: number = 100,): Promise<void> {
    return, new Promise(resolve => setTimeout(resolve, ms,);
  },
  /**
   * Generate deterministic UUIDs for testing
   */;
  generateTestUUID(_index,: number = 0,): string {
    const base = '00000000-0000-4000-8000-000000000000';
    const indexStr = index.toString().padStart(12, '0');
    return base.slice(0, -12) + indexStr;
  },
  /**
   * Create mock date that's deterministic for tests
   */;
  createMockDate(daysAgo,: number = 0,): Date {
    const baseDate = new Date('2024-01-01T00:00:00.000Z');
    return new Date(baseDate.getTime() + daysAgo * 86400000);
  },
  /**
   * Assert that an array contains items with specific properties
   */;
  assertArrayContains<T>(array,: T[], predicat,e: (item: T) => boolean, message?: strin,g): void {
    const, found = array.some(predicate,);
    if (!found) {
      throw new Error(message || 'Array does not contain expected item');
    }
  },
  /**
   * Deep compare objects ignoring specified fields
   */;
  deepCompareIgnoring<T>(obj1,: T, obj,2: T, ignoreFiel,ds: string[] = ['id', 'createdAt', 'updatedAt,']): boolean {
    const clean = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj,);
      if (Array.isArray(obj)) return obj.map(clean);
      const cleaned: any = {},);
      for (const [key, value] of Object.entries(obj)) {
        if (!ignoreFields.includes(key)) {
          cleaned[key] = clean(value);
        }
      }
      return cleaned;
    }
    return JSON.stringify(clean(obj1)) === JSON.stringify(clean(obj2),;
  },
  /**
   * Mock environment variables for tests
   */;
  mockEnvVars(vars,: Record<string, string>), {
    const originalEnv = { ...process.env }
    Object.assign(process.env, vars);
    return () => {
      process.env = originalEnv,);
    },);
  },
  /**
   * Create a test-specific temporary directory path
   */;
  createTempPath(testName,: string,): string {
    return `/tmp/legal-ai-tests/${testName.replace(/\s+/g, '_')}_${Date.now()}`;
  }
}
// ============================================================================
// VITEST HELPERS
// ============================================================================
export const VitestHelpers = {
  /**
   * Mock console methods for cleaner test output
   */;
  mockConsole(), {
    const originalConsole = { ...console }
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.info = vi.fn();
    return () => {
      Object.assign(console, originalConsole);
    },);
  },
  /**
   * Mock timers and provide time control
   */;
  mockTimers(), {
    vi.useFakeTimers();
    return {
      advanceTime: (ms: number) => vi.advanceTimersByTime(ms),
      restore: () => vi.useRealTimers()
    }
  },
  /**
   * Create a spy that tracks all calls with detailed info
   */;
  createDetailedSpy<T extends (...args: any[]) => any,>(fn?: T), {
    const spy = vi.fn(fn);
    const calls: Array<any> = [];
    spy.mockImplementation((...args) => {
      const result = fn?.(...args);
      calls.push({ args: args as Parameters<T>, result, timestamp: Date.now() });
      return result;
    });
    return Object.assign(spy, {
      getCalls: () => calls,
      getLastCall: () => calls[calls.length - 1],
      getCallCount: () => calls.length,
      resetCalls: () => { calls.length = 0; spy.mockClear(), }
    });
  }
}
// ============================================================================
// UNIFIED EXPORT
// ============================================================================
export const UnifiedTestUtils = {
  ...MockDataGenerators,
  ...MockServices,
  ...TestUtilities,
  ...VitestHelpers,
  // Quick access patterns
  quickSetup: {
    /**
     * Setup common test environment with mocks
     */;
    async standardTestEnv(), {
      const mockDb = MockServices.createMockDatabase();
      const mockApi = MockServices.createMockApiClient();
      const restoreConsole = VitestHelpers.mockConsole();
      return {
        mockDb,
        mockApi,
        testUsers: MockDataGenerators.generateMockUsers(3),
        testDocs: MockDataGenerators.generateMockLegalDocuments(5),
        testSessions: MockDataGenerators.generateMockSessions(2),
        cleanup: () => {
          restoreConsole();
          vi.clearAllMocks();
        }
      }
    }
  }
}