/**
 * Debounce utility for performance optimization
 * Prevents excessive function calls during rapid user input
 */
export function debounce<T extends (...args: any[]) => any>(,
  func: T;
  wait: number
  immediate?: boolean;
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    }
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  }
}
/**
 * Throttle utility - limits function calls to once per specified interval
 */
export function throttle<T extends (...args: any[]) => any>(,
  func: T;
  limit: number;
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}
/**
 * RequestAnimationFrame-based throttle for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(,
  func: T;
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      func.apply(this, args);
      rafId = null;
    });
  }
}