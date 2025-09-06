import type {     ComponentType     } from 'svelte';

/**
 * Performance Optimizations for Enhanced Bits UI Components
 *
 * This module provides tree-shaking support, lazy loading, virtualization,
 * and other performance optimizations for legal AI applications.
 */


// Tree-shaking utilities
export interface ComponentModule {
  default: ComponentType;
  name: string;
  dependencies?: string[];
  size?: number;
}

// Lazy loading registry
const componentRegistry = new Map<string, () => Promise<ComponentModule>>();

// Performance metrics tracking
export interface PerformanceMetrics {
  componentLoadTime: number;
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  dependencies: string[];
}

const performanceMetrics = new Map<string, PerformanceMetrics>();

/**
 * Register a component for lazy loading
 */
export function registerComponent(
  name: string,
  loader: () => Promise<ComponentModule>,
): void {
  componentRegistry.set(name, loader);
}

/**
 * Lazy load a component with performance tracking
 */
export async function loadComponent(name: string): Promise<ComponentModule> {
  const loader = componentRegistry.get(name);
  if (!loader) {
    throw new Error(`Component '${name}' not registered`);
  }

  const startTime = performance.now();

  try {
    const module = await loader();
    const loadTime = performance.now() - startTime;

    // Track performance metrics
    performanceMetrics.set(name, {
      componentLoadTime: loadTime,
      renderTime: 0, // Will be updated during render
      memoryUsage: getMemoryUsage(),
      bundleSize: module.size || 0,
      dependencies: module.dependencies || [],
    });

    return module;
  } catch (error: any) {
    console.error(`Failed to load component '${name}':`, error);
    throw error;
  }
}

/**
 * Get current memory usage (if available)
 */
function getMemoryUsage(): number {
  if ("memory" in performance && performance.memory) {
    return (performance.memory as any).usedJSHeapSize;
  }
  return 0;
}

/**
 * Component factory with tree-shaking optimization
 */
export class OptimizedComponentFactory {
  private loadedComponents = new Map<string, ComponentModule>();
  private loadingPromises = new Map<string, Promise<ComponentModule>>();

  async getComponent(name: string): Promise<ComponentModule> {
    // Return cached component if already loaded
    if (this.loadedComponents.has(name)) {
      return this.loadedComponents.get(name)!;
    }

    // Return existing loading promise if component is being loaded
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }

    // Start loading the component
    const loadingPromise = loadComponent(name);
    this.loadingPromises.set(name, loadingPromise);

    try {
      const component = await loadingPromise;
      this.loadedComponents.set(name, component);
      this.loadingPromises.delete(name);
      return component;
    } catch (error: any) {
      this.loadingPromises.delete(name);
      throw error;
    }
  }

  preloadComponent(name: string): void {
    if (!this.loadedComponents.has(name) && !this.loadingPromises.has(name)) {
      this.getComponent(name).catch(console.error);
    }
  }

  getLoadedComponents(): string[] {
    return Array.from(this.loadedComponents.keys());
  }

  getPerformanceMetrics(name: string): PerformanceMetrics | undefined {
    return performanceMetrics.get(name);
  }

  getAllPerformanceMetrics(): Map<string, PerformanceMetrics> {
    return new Map(performanceMetrics);
  }
}

/**
 * Virtual scrolling for large lists of legal documents/evidence
 */
export interface VirtualScrollOptions {
  itemHeight: number;
  bufferSize?: number;
  overscan?: number;
  scrollElement?: HTMLElement;
}

export class VirtualScrollManager {
  private options: Required<VirtualScrollOptions>;
  private scrollTop = 0;
  private containerHeight = 0;
  private totalItems = 0;

  constructor(options: VirtualScrollOptions) {
    this.options = {
      bufferSize: 5,
      overscan: 3,
      scrollElement: document.documentElement,
      ...options,
    };
  }

  updateScrollPosition(scrollTop: number, containerHeight: number): void {
    this.scrollTop = scrollTop;
    this.containerHeight = containerHeight;
  }

  setTotalItems(count: number): void {
    this.totalItems = count;
  }

  getVisibleRange(): { start: number; end: number; offset: number } {
    const { itemHeight, bufferSize, overscan } = this.options;

    const startIndex = Math.floor(this.scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(this.containerHeight / itemHeight) + bufferSize,
      this.totalItems,
    );

    const visibleStart = Math.max(0, startIndex - overscan);
    const visibleEnd = Math.min(this.totalItems, endIndex + overscan);
    const offset = visibleStart * itemHeight;

    return {
      start: visibleStart,
      end: visibleEnd,
      offset,
    };
  }

  getTotalHeight(): number {
    return this.totalItems * this.options.itemHeight;
  }
}

/**
 * Debounced search for evidence and case queries
 */
export function createDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T>,
  delay: number = 300,
): (query: string) => Promise<T> {
  let timeoutId: NodeJS.Timeout;
  let currentPromise: Promise<T> | null = null;

  return (query: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(async () => {
        try {
          // Cancel previous request if still pending
          if (currentPromise) {
            // Note: This would need to be implemented based on your API client
            console.log("Cancelling previous search request");
          }

          currentPromise = searchFn(query);
          const result = await currentPromise;
          currentPromise = null;
          resolve(result);
        } catch (error: any) {
          currentPromise = null;
          reject(error);
        }
      }, delay);
    });
  };
}

/**
 * Memoization utility for expensive computations
 */
export function memoize<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  keyFn?: (...args: Args) => string,
): (...args: Args) => Return {
  const cache = new Map<string, Return>();

  return (...args: Args): Return => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Intersection Observer for lazy loading evidence cards
 */
export class LazyLoadManager {
  private observer: IntersectionObserver;
  private loadingCallbacks = new Map<Element, () => void>();

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: "50px",
        threshold: 0.1,
        ...options,
      },
    );
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const callback = this.loadingCallbacks.get(entry.target);
        if (callback) {
          callback();
          this.unobserve(entry.target);
        }
      }
    });
  }

  observe(element: Element, callback: () => void): void {
    this.loadingCallbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    this.loadingCallbacks.delete(element);
    this.observer.unobserve(element);
  }

  disconnect(): void {
    this.observer.disconnect();
    this.loadingCallbacks.clear();
  }
}

/**
 * Resource pool for managing expensive resources
 */
export class ResourcePool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private factory: () => T;
  private destructor?: (resource: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    maxSize: number = 10,
    destructor?: (resource: T) => void,
  ) {
    this.factory = factory;
    this.maxSize = maxSize;
    this.destructor = destructor;
  }

  acquire(): T {
    let resource: T;

    if (this.available.length > 0) {
      resource = this.available.pop()!;
    } else {
      resource = this.factory();
    }

    this.inUse.add(resource);
    return resource;
  }

  release(resource: T): void {
    if (!this.inUse.has(resource)) {
      return;
    }

    this.inUse.delete(resource);

    if (this.available.length < this.maxSize) {
      this.available.push(resource);
    } else if (this.destructor) {
      this.destructor(resource);
    }
  }

  clear(): void {
    // Destroy all available resources
    if (this.destructor) {
      this.available.forEach(this.destructor);
    }

    this.available = [];
    this.inUse.clear();
  }

  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
      maxSize: this.maxSize,
    };
  }
}

/**
 * Bundle analyzer for component dependencies
 */
export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  components: Array<{
    name: string;
    size: number;
    dependencies: string[];
    critical: boolean;
  }>;
  duplicates: Array<{
    module: string;
    count: number;
    size: number;
  }>;
  recommendations: string[];
}

export function analyzeBundleSize(): BundleAnalysis {
  // This would integrate with your build tool to provide real bundle analysis
  // For now, return mock data for demonstration
  return {
    totalSize: 245000, // 245KB
    gzippedSize: 89000, // 89KB
    components: [
      {
        name: "Button",
        size: 12000,
        dependencies: ["bits-ui", "lucide-svelte"],
        critical: true,
      },
      {
        name: "Dialog",
        size: 18000,
        dependencies: ["bits-ui", "svelte/transition"],
        critical: true,
      },
      {
        name: "Select",
        size: 15000,
        dependencies: ["bits-ui", "lucide-svelte"],
        critical: false,
      },
      {
        name: "VectorIntelligenceDemo",
        size: 45000,
        dependencies: ["Button", "Select", "Input", "Card"],
        critical: false,
      },
    ],
    duplicates: [
      {
        module: "lucide-svelte",
        count: 3,
        size: 8000,
      },
    ],
    recommendations: [
      "Consider lazy loading VectorIntelligenceDemo component",
      "Optimize lucide-svelte imports to reduce duplication",
      "Use dynamic imports for non-critical components",
    ],
  };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  startMonitoring(): void {
    // Monitor long tasks
    if ("PerformanceObserver" in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric("longTask", entry.duration);
        });
      });

      try {
        longTaskObserver.observe({ entryTypes: ["longtask"] });
        this.observers.push(longTaskObserver);
      } catch (e: any) {
        // Long task API not supported
      }

      // Monitor layout shifts
      const layoutShiftObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if ("value" in entry) {
            this.recordMetric("layoutShift", (entry as any).value);
          }
        });
      });

      try {
        layoutShiftObserver.observe({ entryTypes: ["layout-shift"] });
        this.observers.push(layoutShiftObserver);
      } catch (e: any) {
        // Layout shift API not supported
      }
    }
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getMetrics(name: string): number[] {
    return this.metrics.get(name) || [];
  }

  getAverageMetric(name: string): number {
    const values = this.getMetrics(name);
    return values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  stopMonitoring(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }

  clear(): void {
    this.metrics.clear();
  }
}

// Export singleton instances
export const componentFactory = new OptimizedComponentFactory();
export const performanceMonitor = new PerformanceMonitor();
;
// Register enhanced Bits UI components for lazy loading
registerComponent("Button", async () => ({
  name: "Button",
  default: (await import("./Button.svelte")).default
}));
registerComponent("Dialog", async () => ({
  name: "Dialog", 
  default: (await import("./Dialog.svelte")).default
}));
registerComponent("Select", async () => ({
  name: "Select",
  default: (await import("./Select.svelte")).default
}));
registerComponent("Input", async () => ({
  name: "Input",
  default: (await import("./Input.svelte")).default
}));
registerComponent("Card", async () => ({
  name: "Card",
  default: (await import("./Card.svelte")).default
}));
registerComponent("EnhancedBitsDemo", async () => ({
  name: "EnhancedBitsDemo",
  default: (await import("./EnhancedBitsDemo.svelte")).default
}));
registerComponent("VectorIntelligenceDemo", async () => ({
  name: "VectorIntelligenceDemo", 
  default: (await import("./VectorIntelligenceDemo.svelte")).default
}));
