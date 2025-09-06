/**
 * Integration Test Setup
 * Global setup and mocks for integration tests
 */
import { vi, beforeAll, afterAll, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import stream from "stream";
import { URL } from "url";

// Mock SvelteKit environment
vi.mock('$app/environment', () => ({
  dev: true,
  building: false,
  version: '1.0.0-test',
  browser: true
}));

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidate: vi.fn(),
  invalidateAll: vi.fn(),
  preloadData: vi.fn(),
  preloadCode: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
  pushState: vi.fn(),
  replaceState: vi.fn()
}));

// Mock global fetch
global.fetch = vi.fn();

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1, // OPEN
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Mock localStorage
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockStorage,
  writable: true
});

// Mock crypto for session token generation
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn()
  }
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Enhanced database mocking
const createMockDb = () => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([{ now: new Date(), id: 1 }]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 1 }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({ rows: [] })
});

// Mock database operations
vi.mock('$lib/server/db/index.ts', () => ({
  db: createMockDb(),
  sql: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  count: vi.fn(),
  like: vi.fn(),
  ilike: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
  ne: vi.fn(),
  testConnection: vi.fn().mockResolvedValue(true),
  healthCheck: vi.fn().mockResolvedValue({
    status: 'healthy',
    database: 'connected',
    tablesAccessible: true
  }),
  fullSchema: {},
  isPostgreSQL: true
}));

// Mock enhanced database operations
vi.mock('$lib/server/db/enhanced-operations', () => ({
  checkDatabaseHealth: vi.fn().mockResolvedValue({
    status: 'healthy',
    responseTime: 50,
    tablesAccessible: true
  }),
  CaseOperations: {
    create: vi.fn().mockResolvedValue({
      id: 'test-case-id',
      title: 'Test Case',
      status: 'active',
      caseNumber: 'CASE-001'
    }),
    search: vi.fn().mockResolvedValue({
      cases: [],
      total: 0
    }),
    update: vi.fn().mockResolvedValue({
      id: 'test-case-id',
      title: 'Updated Test Case'
    })
  },
  EvidenceOperations: {
    create: vi.fn(),
    search: vi.fn()
  },
  UserOperations: {
    findById: vi.fn(),
    create: vi.fn()
  }
}));

// Mock Drizzle ORM imports
vi.mock('drizzle-orm', () => ({
  sql: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  count: vi.fn(),
  like: vi.fn(),
  ilike: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
  ne: vi.fn()
}));

// Mock Redis service
vi.mock('$lib/server/redis/redis-service.ts', () => ({
  redisService: {
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue('test-value'),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    disconnect: vi.fn()
  }
}));

// Mock Ollama service  
vi.mock('$lib/server/services/OllamaService.js', () => ({
  ollamaService: {
    generate: vi.fn().mockResolvedValue('Test AI response'),
    isHealthy: vi.fn().mockResolvedValue(true),
    listModels: vi.fn().mockResolvedValue([
      { name: 'gemma3-legal:latest', size: '7.3GB' },
      { name: 'nomic-embed-text:latest', size: '274MB' }
    ])
  }
}));

// Mock API response helpers
vi.mock('$lib/server/api/response', () => ({
  withApiHandler: vi.fn((handler, event) => handler(event)),
  parseRequestBody: vi.fn().mockImplementation((request, schema) => ({ title: 'Test', priority: 'medium' })),
  apiSuccess: vi.fn((data) => ({ success: true, data })),
  validationError: vi.fn((message) => ({ error: message })),
  createPagination: vi.fn((page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) })),
  CommonErrors: {
    BadRequest: vi.fn((message) => new Error(message)),
    Unauthorized: vi.fn((message) => new Error(message)),
    NotFound: vi.fn((type) => new Error(`${type} not found`)),
    ValidationFailed: vi.fn((field, message) => new Error(`Validation failed: ${message}`))
  }
}));

// Mock embedding repository
vi.mock('$lib/server/embedding/embedding-repository.js', () => ({
  getEmbeddingRepository: vi.fn(() => ({
    enqueueIngestion: vi.fn().mockResolvedValue({ jobId: 'test-job-id', status: 'queued' }),
    getJobStatus: vi.fn().mockResolvedValue({ jobId: 'test-job-id', status: 'completed' }),
    processNextJob: vi.fn().mockResolvedValue(null),
    querySimilar: vi.fn().mockResolvedValue([
      { id: '1', content: 'Test result', score: 0.95, documentId: 'doc-1' }
    ])
  }))
}));

// Mock production logger
vi.mock('$lib/server/production-logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock SSR cache
vi.mock('$lib/server/ssr/enhanced-load', () => ({
  SSRCache: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn()
  }
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock File API with enhanced methods
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  private _bits: BlobPart[];

  constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    this.name = name;
    this.type = options?.type || '';
    this.lastModified = options?.lastModified || Date.now();
    this._bits = bits;
    this.size = bits.reduce((size, bit) => {
      if (typeof bit === 'string') return size + bit.length;
      if (bit instanceof ArrayBuffer) return size + bit.byteLength;
      return size + (bit as any).length;
    }, 0);
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    // Convert all bits to a single ArrayBuffer
    let totalSize = this.size;
    const buffer = new ArrayBuffer(totalSize);
    const view = new Uint8Array(buffer);
    let offset = 0;

    for (const bit of this._bits) {
      if (typeof bit === 'string') {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(bit);
        view.set(encoded, offset);
        offset += encoded.length;
      } else if (bit instanceof ArrayBuffer) {
        view.set(new Uint8Array(bit), offset);
        offset += bit.byteLength;
      } else if (bit instanceof Uint8Array) {
        view.set(bit, offset);
        offset += bit.length;
      }
    }
    
    return buffer;
  }

  async text(): Promise<string> {
    const buffer = await this.arrayBuffer();
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }

  stream(): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        this.arrayBuffer().then(buffer => {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        });
      }
    });
  }

  slice(start?: number, end?: number, contentType?: string): MockFile {
    // Simple slice implementation for mocking
    return new MockFile(this._bits, this.name, { type: contentType || this.type });
  }
} as any;

global.FileReader = class MockFileReader extends EventTarget {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState: number = 0;

  readAsText(file: File) {
    setTimeout(() => {
      this.result = 'mocked file content';
      this.readyState = 2;
      this.dispatchEvent(new Event('loadend'));
    }, 0);
  }

  readAsDataURL(file: File) {
    setTimeout(() => {
      this.result = `data:${file.type};base64,mockedcontent`;
      this.readyState = 2;
      this.dispatchEvent(new Event('loadend'));
    }, 0);
  }

  readAsArrayBuffer(file: File) {
    setTimeout(() => {
      this.result = new ArrayBuffer(file.size);
      this.readyState = 2;
      this.dispatchEvent(new Event('loadend'));
    }, 0);
  }
} as any;

// Mock FormData API for file uploads
global.FormData = class MockFormData {
  private _data: Map<string, any> = new Map();

  constructor() {}

  append(name: string, value: string | File | Blob, filename?: string) {
    if (!this._data.has(name)) {
      this._data.set(name, []);
    }
    this._data.get(name).push(value);
  }

  delete(name: string) {
    this._data.delete(name);
  }

  get(name: string): FormDataEntryValue | null {
    const values = this._data.get(name);
    return values ? values[0] : null;
  }

  getAll(name: string): FormDataEntryValue[] {
    return this._data.get(name) || [];
  }

  has(name: string): boolean {
    return this._data.has(name);
  }

  set(name: string, value: string | File | Blob, filename?: string) {
    this._data.set(name, [value]);
  }

  forEach(callback: (value: FormDataEntryValue, name: string, formData: FormData) => void) {
    for (const [name, values] of this._data) {
      for (const value of values) {
        callback(value, name, this as any);
      }
    }
  }

  keys(): IterableIterator<string> {
    return this._data.keys();
  }

  values(): IterableIterator<FormDataEntryValue> {
    const allValues: FormDataEntryValue[] = [];
    for (const values of this._data.values()) {
      allValues.push(...values);
    }
    return allValues[Symbol.iterator]();
  }

  entries(): IterableIterator<[string, FormDataEntryValue]> {
    const allEntries: [string, FormDataEntryValue][] = [];
    for (const [name, values] of this._data) {
      for (const value of values) {
        allEntries.push([name, value]);
      }
    }
    return allEntries[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<[string, FormDataEntryValue]> {
    return this.entries();
  }
} as any;

// Mock Blob API
global.Blob = class MockBlob {
  size: number;
  type: string;
  private _parts: BlobPart[];

  constructor(blobParts?: BlobPart[], options?: BlobPropertyBag) {
    this._parts = blobParts || [];
    this.type = options?.type || '';
    this.size = this._parts.reduce((size, part) => {
      if (typeof part === 'string') return size + part.length;
      if (part instanceof ArrayBuffer) return size + part.byteLength;
      return size + (part as any).length;
    }, 0);
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const buffer = new ArrayBuffer(this.size);
    const view = new Uint8Array(buffer);
    let offset = 0;

    for (const part of this._parts) {
      if (typeof part === 'string') {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(part);
        view.set(encoded, offset);
        offset += encoded.length;
      } else if (part instanceof ArrayBuffer) {
        view.set(new Uint8Array(part), offset);
        offset += part.byteLength;
      }
    }

    return buffer;
  }

  async text(): Promise<string> {
    const buffer = await this.arrayBuffer();
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }

  stream(): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: (controller) => {
        this.arrayBuffer().then(buffer => {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        });
      }
    });
  }

  slice(start?: number, end?: number, contentType?: string): MockBlob {
    return new MockBlob(this._parts, { type: contentType || this.type });
  }
} as any;

// Setup default fetch responses
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Default fetch implementation
  (global.fetch as any).mockImplementation((url: string, options?: RequestInit) => {
    // Health check endpoint
    if (url.includes('/api/health')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          status: 'healthy',
          services: {
            database: { status: 'ok' },
            redis: { status: 'ok' },
            ollama: { status: 'ok' }
          },
          timestamp: new Date().toISOString()
        })
      });
    }

    // Debug logs endpoint
    if (url.includes('/api/debug/logs')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          logs: [
            { level: 'info', message: 'Test log entry', timestamp: new Date().toISOString() }
          ],
          timestamp: new Date().toISOString()
        })
      });
    }

    // AI chat endpoint
    if (url.includes('/api/ai/chat')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'text/stream' }),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                value: new TextEncoder().encode('{"response":"Test response"}'),
                done: false
              })
              .mockResolvedValueOnce({ done: true })
          })
        }
      });
    }

    // Vector search endpoint
    if (url.includes('/api/ai/vector-search')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          results: [
            { id: '1', title: 'Test Result', similarity: 0.95 }
          ],
          query: 'test query'
        })
      });
    }

    // Upload endpoint
    if (url.includes('/api/upload')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          fileId: 'test-file-id',
          metadata: { size: 1024, type: 'application/pdf' }
        })
      });
    }

    // Cases endpoint
    if (url.includes('/api/cases')) {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            id: 'new-case-id',
            title: 'New Case',
            status: 'active'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          id: 'test-case',
          title: 'Test Case',
          status: 'active'
        })
      });
    }

    // Default response
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('')
    });
  });
});

// Global cleanup
afterAll(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});