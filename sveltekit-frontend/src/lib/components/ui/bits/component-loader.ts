/**
 * Dynamic Component Loader for Enhanced-Bits
 * Supports lazy loading and error boundaries
 */
import type { ComponentType } from 'svelte';
export interface ComponentModule {
  default: ComponentType;
}
export interface LoadComponentOptions {
  fallback?: ComponentType;
  retryAttempts?: number;
  timeout?: number;
}
// Component registry for faster lookups
const componentCache = new Map<string, Promise<ComponentType | null>>();
/**
 * Dynamically load a Svelte component
 */
export async function loadComponent(
  name: string;
  options: LoadComponentOptions = {}
): Promise<ComponentType | null> {
  const { fallback = null, retryAttempts = 3, timeout = 5000 } = options;
  // Check cache first
  if (componentCache.has(name)) {
    return componentCache.get(name)!;
  }
  // Create loading promise
  const loadingPromise = loadComponentWithRetry(name, retryAttempts, timeout);
  componentCache.set(name, loadingPromise);
  try {
    const component = await loadingPromise;
    return component || fallback;
  } catch (error) {
    console.warn(`Failed to load component ${name}:`, error);
    return fallback;
  }
}
async function loadComponentWithRetry(
  name: string,
  retryAttempts: number;
  timeout: number
): Promise<ComponentType | null> {
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      return await loadComponentSingle(name, timeout);
    } catch (error) {
      if (attempt === retryAttempts) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
  return null;
}
async function loadComponentSingle(name: string, timeout: number): Promise<ComponentType | null> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Component load timeout')), timeout);
  });
  const loadPromise = tryLoadFromPaths(name);
  return Promise.race([loadPromise, timeoutPromise]);
}
async function tryLoadFromPaths(name: string): Promise<ComponentType | null> {
  // Define possible paths to search
  const searchPaths = [
    `../components/${name}.svelte`,
    `../components/ui/${name}.svelte`,
    `../components/ui/${name.toLowerCase()}/${name}.svelte`,
    `../components/gaming/${name}.svelte`,
    `../components/ai/${name}.svelte`,
    `../components/legal/${name}.svelte`,
    `../components/forms/${name}.svelte`,
    `../components/charts/${name}.svelte`,
    `../components/ui/button/${name}.svelte`,
    `../components/ui/card/${name}.svelte`,
    `../components/ui/dialog/${name}.svelte`,
    `../components/ui/input/${name}.svelte`,
    `../components/ui/label/${name}.svelte`,
  ];
  // Try each path
  for (const path of searchPaths) {
    try {
      const module = await import(path) as ComponentModule;
      if (module.default) {
        return module.default;
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }
  throw new Error(`Component ${name} not found in any search path`);
}
/**
 * Preload commonly used components
 */
export async function preloadCoreComponents(): Promise<void> {
  const coreComponents = [
    'Button',
    'Card',
    'CardHeader',
    'CardTitle',
    'CardContent',
    'Dialog',
    'Input',
    'Label'
  ];
  const loadPromises = coreComponents.map(name =>
    loadComponent(name).catch(error => {
      console.warn(`Failed to preload ${name}:`, error);
      return null;
    })
  );
  await Promise.all(loadPromises);
}
/**
 * Clear component cache
 */
export function clearComponentCache(): void {
  componentCache.clear();
}
/**
 * Get cached component without loading
 */
export function getCachedComponent(name: string): Promise<ComponentType | null> | undefined {
  return componentCache.get(name);
}
/**
 * Gaming-specific component loader
 */
export async function loadGamingComponent(
  name: 'N64Button' | 'NESContainer' | 'PixelCard' | 'ConsoleCard' | 'RetroDialog'
): Promise<ComponentType | null> {
  try {
    const module = await import(`../components/gaming/${name}.svelte`) as ComponentModule;
    return module.default;
  } catch (error) {
    console.warn(`Gaming component ${name} not found:`, error);
    return null;
  }
}
/**
 * Legal AI specific component loader
 */
export async function loadLegalComponent(
  name: string
): Promise<ComponentType | null> {
  const legalPaths = [
    `../components/legal/${name}.svelte`,
    `../components/ai/${name}.svelte`,
    `../components/evidence/${name}.svelte`,
    `../components/case/${name}.svelte`
  ];
  for (const path of legalPaths) {
    try {
      const module = await import(path) as ComponentModule;
      if (module.default) {
        return module.default;
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}