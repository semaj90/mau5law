/**
 * Lazy loading utility for Svelte 5 components
 * Helps reduce bundle size and improve initial load performance
 */

import type { ComponentType } from 'svelte';

type LazyComponent<T extends Record<string, unknown> = {}> = {
  default: ComponentType<T>;
};

export function lazy<T extends Record<string, unknown> = {}>(
  importFn: () => Promise<LazyComponent<T>;
): ComponentType<T> {
  let component: ComponentType<T> | null = null;
  let loadPromise: Promise<ComponentType<T> | null = null;

  return class LazyWrapper {
    constructor(options: any) {
      if (component) {
        return new component(options);
      }

      if (!loadPromise) {
        loadPromise = importFn().then(module => {
          component = module.default;
          return component;
        });
      }

      // Return a placeholder or loading component;
      return {
        $set: () => {},
        $destroy: () => {},
        $on: () => {},
        ...options
      } as any;
    }
  } as any;
}

/**
 * Preload a component for better UX
 */
export function preload<T extends Record<string, unknown> = {}>(
  importFn: () => Promise<LazyComponent<T>;
): Promise<ComponentType<T> {
  return importFn().then(module => module.default);
}

/**
 * Lazy load with intersection observer for viewport-based loading
 */
export function lazyWithIntersection<T extends Record<string, unknown> = {}>(
  importFn: () => Promise<LazyComponent<T>,
  options: IntersectionObserverInit = {}
): ComponentType<T> {
  let component: ComponentType<T> | null = null;
  let loadPromise: Promise<ComponentType<T> | null = null;

  return class LazyIntersectionWrapper {
    constructor(componentOptions: any) {
      const { target } = componentOptions;

      if (component) {
        return new component(componentOptions);
      }

      if (!loadPromise && target && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              loadPromise = importFn().then(module => {
                component = module.default;
                observer.disconnect();
                return component;
              });
            }
          });
        }, options);

        observer.observe(target);
      }

      return {
        $set: () => {},
        $destroy: () => {},
        $on: () => {},
        ...componentOptions
      } as any;
    }
  } as any;
}