// Minimal structured logger stub to satisfy imports and provide basic console logging.

class StructuredLogger {
  async logAPIRequest(entry) {
    console.debug('[api:req]', entry.requestId, entry.method, entry.endpoint);
  }
  async logAPIResponse(entry) {
    if (entry.success) {
      console.debug('[api:res]', entry.requestId, entry.statusCode, entry.processingTime + 'ms');
    } else {
      console.warn('[api:res:err]', entry.requestId, entry.statusCode, entry.error);
    }
  }
  async logError(entry) {
    console.error('[error]', entry.context || 'general', entry.error, entry.requestId || '');
  }
  async logEvent(entry) {
    console.info('[event]', entry.type || 'generic', entry.message || '');
  }
}

export const logger = new StructuredLogger();
