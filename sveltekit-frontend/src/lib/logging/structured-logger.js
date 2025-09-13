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
  async logDocumentProcessing(entry) {
    console.debug('[doc:process]', entry.documentId || 'unknown', entry.operation || 'unknown');
  }
  async logSearch(entry) {
    console.debug('[search]', entry.query || 'unknown', entry.resultsCount || 0);
  }
}

export const logger = new StructuredLogger();
