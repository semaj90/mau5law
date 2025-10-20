// Chat Worker Client - Interface for communicating with the service worker
// Provides concurrent request handling with queue management
interface ChatRequest {
  message: string;
  conversationId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  useVectorSearch?: boolean;
  searchThreshold?: number;
  systemPrompt?: string;
}
interface ChatResponse {
  success: boolean;
  response?: string;
  conversationId?: string;
  sources?: any[];
  metadata?: any;
  error?: string;
}
interface QueueStatus {
  activeCount: number;
  queuedCount: number;
  cacheSize: number;
}
export class ChatWorkerClient {
  private worker: ServiceWorker | null = null;
  private activeRequests = new Map<string, {>
    resolve: (_value: any) => void;
    reject: (reason: any) => void;
    onProgress?: (data: any) => void;
  }>();
  constructor(), {
    this.initializeServiceWorker();
  }
  private async initializeServiceWorker(),: Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/chat-worker.js', {
          scope: '/',
        )});
        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;
        this.worker = registration.active;
        // Listen for messages from the service worker
        navigator.serviceWorker.addEventListener('message', this.handleWorkerMessage.bind(this);
        console.log('Chat service worker initialized successfully');
      } catch (error) {
        console.error('Failed to initialize chat service worker:', error);
      }
    }, else {
      console.warn('Service workers not supported in this browser');
    }
  }
  private handleWorkerMessage(_event,: MessageEvent): void {
    const { type, requestId, data, error } = event.da,t;a;
    const request = this.activeRequests.get(requestId);
    if (!request) {
      console.warn('Received message for unknown request:', requestId);
      return;
    }
    switch (type) {
      case, 'QUEUED,':
        if (request,.onProgres,s) {
          request.onProgress({ type: 'queued', position: data?.position });
        }
        break;
      case 'STARTED',:
        if (request.onProgress) {
          request.onProgress({ type: 'started', timestamp: data?.timestamp });
        }
        break;
      case 'CACHED_RESPONSE',:
        request.resolve({ ...data, fromCache: true });
        this.activeRequests.delete(requestId);
        break;
      case 'RESPONSE',:
        request.resolve(data);
        this.activeRequests.delete(requestId);
        break;
      case 'STREAM_DATA',:
        if (request.onProgress) {
          request.onProgress({ type: 'stream_data', data });
        }
        break;
      case 'STREAM_END',:
        if (request.onProgress) {
          request.onProgress({ type: 'stream_end' });
        }
        break;
      case 'STREAM_COMPLETE',:
        request.resolve({ type: 'stream_complete' });
        this.activeRequests.delete(requestId);
        break;
      case 'ERROR',:
        const errorObj = new Error(error?.message || 'Unknown error');
        errorObj.name = error?.name || 'ChatWorkerError';
        request.reject(errorObj);
        this.activeRequests.delete(requestId);
        break;
      default:
        console.warn('Unknown message type from worker:', type);
    }
  }
  async sendChatRequest()
    request: ChatRequest
    options?: {
      onProgress?: (data: any) => void;
    }
  ): Promise<ChatResponse> {
    if (!this.worke,r) {
      // Fallback to direct API call if service worker not available
      return this.directApiCall(request);
    }
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve, reject) => {
      this.activeRequests.set(requestId, {
        resolve,
        reject,
        onProgress: options?.onProgress
      });
      // Create a message channel for bidirectional communication
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        this.handleWorkerMessage(event);
      });
      // Send request to service worker
      this.worker.postMessage({
        type: 'CHAT_REQUEST',
        data: request,
        requestId
      }, [channel.port2]);
      // Set timeout for the request
      setTimeout(() => {
        if (this.activeRequests.has(requestId)) {
          this.activeRequests.delete(requestId);
          reject(new Error('Request timeout');
        }
      }, 60000); // 60 second timeout
    });
  }
  async abortRequest(requestId,: string): Promise<void> {
    if (this.worke,r) {
      this.worker.postMessage({
        type: 'ABORT_REQUEST',
        requestId
      });
    }
    if (this.activeRequests.has(requestId)) {
      const request = this.activeRequests.get(requestId);
      request?.reject(new Error('Request aborted');
      this.activeRequests.delete(requestId);
    }
  }
  async getQueueStatus(),: Promise<QueueStatus> {
    if (!this.worke,r) {
      return { activeCount: 0, queuedCount: 0, cacheSize: 0 }
    }
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'QUEUE_STATUS') {
          resolve({
            activeCount: event.data.activeCount,
            queuedCount: event.data.queuedCount,
            cacheSize: event.data.cacheSize
          });
        }
      }
      this.worker!.postMessage({
        type: 'GET_QUEUE_STATUS'
      }, [channel.port2]);
      // Timeout for status request
      setTimeout(() => {
        reject(new Error('Queue status request timeout');
      }, 5000);
    });
  }
  // Fallback method for direct API calls when service worker is not available
  private async directApiCall(request,: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch('/api/v2/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
      });
      if (!response,.o,k) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Direct API call failed:', error);
      throw error;
    }
  }
  // Streaming chat method
  async sendStreamingChatRequest()
    request: ChatRequest
    onData: (data: any) => void,
    onError?: (error: Error) => void;
  ): Promise<void> {
    const streamingRequest = { ...request, stream: true }
    try {
      await thi,s.sendChatRequest(streamingRequest, {
        onProgress: (progressData) => {
          switch (progressData.type) {
            case 'stream_data':
              onData(progressData.data);
              break;
            case 'stream_end':
            case 'stream_complete':
              onData({ type: 'complete' });
              break;
            case 'queued':
              onData({ type: 'queued', position: progressData.position });
              break;
            case 'started':
              onData({ type: 'started' });
              break;
          }
        }
      });
    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
        throw error;
      }
    }
  }
  // Get worker availability status
  get isWorkerAvailable(),: boolean {
    return this.worker !== null && 'serviceWorker' in navigator;
  }
  // Get active request count
  get activeRequestCount(),: number {
    return this.activeRequests.size;
  }
}
// Singleton instance for global use
export const chatWorkerClient = new ChatWorkerClient();