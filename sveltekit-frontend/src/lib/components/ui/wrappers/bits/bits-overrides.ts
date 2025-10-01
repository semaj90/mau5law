// Runtime override registry for wrapper components
// Allows tests or local dev to substitute alternative implementations.
export type OverrideMap = Record<string, any>;

// Simple, mutable global used by wrappers to check for overrides.
// In dev or tests you can set window.__BITS_OVERRIDES__ = { Button: MyButtonImpl }
export function getBitsOverrides(): OverrideMap | undefined {
  try {
    // @ts-ignore - window may not have the key
    return (globalThis as any).__BITS_OVERRIDES__;
  } catch {
    return undefined;
  }
}

export function registerOverride(name: string, impl: any) {
  try {
    // @ts-ignore
    if (!(globalThis as any).__BITS_OVERRIDES__) (globalThis as any).__BITS_OVERRIDES__ = {};
    // @ts-ignore
    (globalThis as any).__BITS_OVERRIDES__[name] = impl;
  } catch (err) {
    // no-op
  }
}
