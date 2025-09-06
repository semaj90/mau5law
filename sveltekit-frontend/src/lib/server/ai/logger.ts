// Minimal logger to satisfy imports. Extend with winston/pino as needed.
export const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) => {
    if (import.meta.env.DEBUG) console.debug('[DEBUG]', ...args);
  },
};
