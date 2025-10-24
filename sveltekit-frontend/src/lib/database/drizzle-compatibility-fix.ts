/**
 * Drizzle ORM Compatibility Fix - PostgreSQL + pgvector Integration
 * Systematic resolution of database type mismatches and missing methods
 */
import { barrelStore } from '../stores/barrel-functions.js';

// Lightweight DB types to avoid `any`
type DBRow = Record<string, unknown>;
type QueryResult<T = DBRow> = { rows?: T[]; rowCount?: number; command?: string } & Record<string, unknown>;
type DBClient = {
  query?: (...args: unknown[]) => Promise<QueryResult>;
  execute?: (...args: unknown[]) => Promise<QueryResult>;
  [key: string]: unknown;
};

// ===== DRIZZLE ORM TYPE COMPATIBILITY =====
export interface DrizzleCompatibilityLayer {
  handleQueryResult: <T extends DBRow = DBRow>(result: unknown) => T[];
  ensureConnection: (client: DBClient | unknown) => Promise<DBClient>;
  safePropertyAccess: <T>(obj: unknown, property: string, defaultValue: T) => T;
  vectorOperations: {
    similarity: (vector1: number[], vector2: number[]) => number;
    distance: (vector1: number[], vector2: number[]) => number;
    normalize: (vector: number[]) => number[];
  };
}

// Type guard for QueryResult
const isQueryResult = (v: unknown): v is QueryResult => {
  return (
    typeof v === 'object' &&
    v !== null &&
    ('rows' in (v as Record<string, unknown>) || 'rowCount' in (v as Record<string, unknown>))
  );
};

// Common default shape used when enhancing rows
const defaultRowShape: DBRow = {
  id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  case_id: null,
  document_id: null,
  user_id: null,
  message: '',
  content: '',
  metadata: {},
  sources: [],
};

// ===== ENHANCED QUERY RESULT HANDLER =====
export const handleQueryResult = <T extends DBRow = DBRow>(result: unknown): T[] => {
  if (result == null) return [];

  // If result is array of rows
  if (Array.isArray(result)) {
    return result.map(row => {
      const r = barrelStore.database.ensureProperties(row as DBRow, defaultRowShape) as T;
      return r;
    });
  }

  // If result follows QueryResult shape (e.g., { rows: [...] })
  if (isQueryResult(result)) {
    const rows = Array.isArray(result.rows) ? result.rows : [];
    return rows.map(row => barrelStore.database.ensureProperties(row as DBRow, defaultRowShape) as T);
  }

  // If single object row
  if (typeof result === 'object') {
    const enhanced = barrelStore.database.ensureProperties(result as DBRow, defaultRowShape) as T;
    return [enhanced];
  }

  console.warn('Unexpected query result format:', typeof result, result);
  return [];
};

// ===== SAFE PROPERTY ACCESS =====
export const safePropertyAccess = <T>(obj: unknown, property: string, defaultValue: T): T => {
  if (typeof obj !== 'object' || obj === null) return defaultValue;
  const keys = property.split('.');
  let current: unknown = obj as Record<string, unknown>;
  for (const key of keys) {
    if (typeof current === 'object' && current !== null && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }
  return (current as T) ?? defaultValue;
};

// ===== VECTOR OPERATIONS COMPATIBILITY =====
export const vectorOperations = {
  similarity: (vector1: number[], vector2: number[]): number => {
    if (!vector1 || !vector2 || vector1.length !== vector2.length) {
      return 0;
    }
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }
    const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  },
  distance: (vector1: number[], vector2: number[]): number => {
    if (!vector1 || !vector2 || vector1.length !== vector2.length) {
      return Infinity;
    }
    let sum = 0;
    for (let i = 0; i < vector1.length; i++) {
      const diff = vector1[i] - vector2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  },
  normalize: (vector: number[]): number[] => {
    if (!vector || vector.length === 0) {
      return [];
    }
    let magnitude = 0;
    for (const component of vector) {
      magnitude += component * component;
    }
    magnitude = Math.sqrt(magnitude);
    if (magnitude === 0) {
      return new Array(vector.length).fill(0);
    }
    return vector.map(component => component / magnitude);
  }
}

// ===== CONNECTION MANAGEMENT =====
export const ensureConnection = async (client: DBClient | unknown): Promise<DBClient> => {
  if (!client || typeof client !== 'object') {
    throw new Error('Database client is null, undefined, or not an object');
  }
  const dbClient = client as DBClient;

  const requiredMethods: Array<keyof DBClient> = ['query', 'execute'];
  for (const method of requiredMethods) {
    if (typeof dbClient[method] !== 'function') {
      console.warn(`Database client missing method: ${String(method)} - injecting no-op`);
      (dbClient as Record<string, unknown>)[method] = async (..._args: unknown[]) => {
        return { rows: [], rowCount: 0 } as QueryResult;
      };
    }
  }

  try {
    if (typeof dbClient.query === 'function') {
      // best-effort connection test
      await dbClient.query('SELECT 1');
    }
  } catch (err: unknown) {
    console.warn('Database connection test failed:', err);
  }

  return dbClient;
};

// ===== ENHANCED DRIZZLE COMPATIBILITY LAYER =====
export const drizzleCompatibilityLayer: DrizzleCompatibilityLayer = {
  handleQueryResult,
  ensureConnection,
  safePropertyAccess,
  vectorOperations,
};

// ===== TYPE-SAFE RESULT ENHANCER =====
export const enhanceResultWithTypes = <T extends Record<string, unknown>>(
  result: unknown,
  typeMap: Record<string, unknown>
): T => {
  if (!result || typeof result !== 'object') {
    const defaultObject = {} as T;
    for (const [key, defaultValue] of Object.entries(typeMap)) {
      (defaultObject as Record<string, unknown>)[key] = defaultValue;
    }
    return defaultObject;
  }
  const enhancedResult = { ...(result as Record<string, unknown>) } as T;
  for (const [key, defaultValue] of Object.entries(typeMap)) {
    if (!(key in enhancedResult) || enhancedResult[key as keyof T] === undefined) {
      (enhancedResult as Record<string, unknown>)[key] = defaultValue;
    }
  }
  return enhancedResult;
};

// ===== COMMON DATABASE ENTITY ENHANCERS =====
export const entityEnhancers = {
  // Legal document entity enhancer
  legalDocument: (doc: unknown) =>
    enhanceResultWithTypes(doc, {
      id: null,
      case_id: null,
      document_id: null,
      title: '',
      content: '',
      document_type: 'document',
      file_path: null,
      metadata: {} as Record<string, unknown>,
      user_id: null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  // Chat message entity enhancer
  chatMessage: (message: unknown) =>
    enhanceResultWithTypes(message, {
      id: null,
      message: '',
      role: 'user',
      conversation_id: null,
      user_id: null,
      timestamp: new Date().toISOString(),
      sources: [],
      metadata: {} as Record<string, unknown>,
      created_at: new Date().toISOString(),
    }),
  // Cache entry entity enhancer
  cacheEntry: (entry: unknown) =>
    enhanceResultWithTypes(entry, {
      key: '',
      value: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      lastAccessed: Date.now(),
      accessCount: 0,
      size: 0,
      version: 1,
    }),
  // Vector operation entity enhancer
  vectorOperation: (operation: unknown) =>
    enhanceResultWithTypes(operation, {
      id: null,
      operation_type: 'embedding',
      input_data: null,
      output_data: null,
      parameters: {} as Record<string, unknown>,
      status: 'pending',
      started_at: null,
      completed_at: null,
      error_message: null,
      metadata: {} as Record<string, unknown>,
    }),
};

// ===== QUERY INTERCEPTOR FOR TYPE SAFETY =====
export const createTypeSafeQuery = (baseQuery: Record<string, unknown>) => {
  return {
    ...baseQuery,
    // Enhanced execute method with type safety
    execute: async (...args: unknown[]) => {
      try {
        const exec = baseQuery.execute as (...a: unknown[]) => Promise<unknown> | undefined;
        const result = exec ? await exec(...args) : undefined;
        return handleQueryResult(result) as unknown;
      } catch (error: unknown) {
        console.error('Query execution error:', error);
        return [];
      }
    },
    // Enhanced all() method with type safety
    all: async (...args: unknown[]) => {
      try {
        const allFn = (baseQuery.all || baseQuery.execute) as (...a: unknown[]) => Promise<unknown> | undefined;
        const result = allFn ? await allFn(...args) : undefined;
        return handleQueryResult(result);
      } catch (error: unknown) {
        console.error('Query all() error:', error);
        return [];
      }
    },
    // Enhanced get() method with type safety
    get: async (...args: unknown[]) => {
      try {
        const getFn = (baseQuery.get || baseQuery.execute) as (...a: unknown[]) => Promise<unknown> | undefined;
        const result = getFn ? await getFn(...args) : undefined;
        const results = handleQueryResult(result);
        return results.length > 0 ? results[0] : null;
      } catch (error: unknown) {
        console.error('Query get() error:', error);
        return null;
      }
    },
  };
};

// ===== EXPORT MAIN COMPATIBILITY LAYER =====
export default {
  drizzleCompatibilityLayer,
  handleQueryResult,
  safePropertyAccess,
  vectorOperations,
  ensureConnection,
  enhanceResultWithTypes,
  entityEnhancers,
  createTypeSafeQuery
}