// Type Assertion Utilities for Complex Services
export function assertAny<T>(value: unknown): T {
  return value as T;
}
export function safeAccess<T>(obj: any, path: string, defaultValue?: T): T {
  try {
    return path.split('.').reduce((o, p) => o?.[p], obj) ?? defaultValue;
  } catch {
    return defaultValue as T;
  }
}
export function withFallback<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
// WebGPU compatibility
export function asBuffer(data: any): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  if (data?.buffer instanceof ArrayBuffer) return data.buffer;
  if (Array.isArray(data)) return new Float32Array(data).buffer;
  return new ArrayBuffer(0);
}
// Property access helpers
export function hasProperty(obj: any, prop: string): boolean {
  return obj != null && typeof obj === 'object' && prop in obj;
}
export function getProperty<T>(obj: any, prop: string, fallback?: T): T {
  return hasProperty(obj, prop) ? obj[prop] : fallback;
}