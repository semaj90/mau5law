/**
 * Go Tensor Service Client - Integration with Go microservice on port 8095
 * Provides TypeScript client for gRPC and HTTP tensor processing services
 */
// Tensor processing types
export interface TensorRequest {
  id: string;
  documentId: string;
  data: Float32Array | number[];
  operation: 'process' | 'vectorize' | 'analyze' | 'similarity';
  options?: {
    batchSize?: number;
  timeout?: number;
  priority?: number;
  }
}
export interface TensorResponse {
  id: string;
  success: boolean;
  result?: {
    processedData?: Float32Array | number[];
  embeddings?: Float32Array | number[];
  metadata?: { [key: string]: any }
  similarity?: number;
  processingTime?: number;
  }
  error?: string;
  timestamp: Date;
}
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'offline';
  lastCheck: Date;
  latency?: number;
  version?: string;
  connections?: number;
}
// HTTP client for RESTful endpoints
class GoTensorHTTPClient {
  private baseUrl: string;
  private timeout: number;
  constructor(baseUrl = 'http://localhost:8095', timeout = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }
  // Health check endpoint
  async healthCheck(): Promise<ServiceHealth> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const start = Date.now();
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      )});
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      if (!(response as { ok?: any; status?: any; statusText?: any; json?: any }).ok) {
        throw new Error(`HTTP ${(response as { ok?: any; status?: any; statusText?: any,); json?: any }).status}: ${(response as { ok?: any; status?: any; statusText?: any; json?: any }).statusText}`);
      }
      const data = await (response as { ok?: any; status?: any; statusText?: any; json?: any }).json();
      return {
        status: 'healthy',
        lastCheck: new Date(),
        latency,
        version: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).version,
        connections: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).connections
      }
    } catch (error) {
      return {
        status: 'offline',
        lastCheck: new Date()
      }
    }
  }
  // Process tensor data
  async processTensor(request: TensorRequest): Promise<TensorResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), request.options?.timeout || this.timeout);
      // Convert Float32Array to regular array for JSON serialization
      const data = request.data instanceof Float32Array ? Array.from(request.data) : request.data;
      const response = await fetch(`,${this.baseUrl}/api/tensor/process`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({,
          id: request.id,
          documentId: request.documentId,
          data,
          operation: request.operation,
          options: request.options
        )})
      });
      clearTimeout(timeoutId);
      if (!(response as { ok?: any; status?: any; statusText?: any; json?: any }).ok) {
        throw new Error(`,HTTP ${(response as { ok?: any; status?: any; statusText?: an,y); json?: any }).status}: ${(response as { ok?: any; status?: any; statusText?: any; json?: any }).statusText}`);
      }
      const result = await (response as { ok?: any; status?: any; statusText?: any; json?: any }).json();
      return {
        id: request.id,
        success: (result as { success?: any; result?: any; responses?: any; processedData?: any; embeddings?: any; metadata?: any; similarity?: any; processingTime?: any }).success,
        result: {
          processedData: (result as { success?: any; result?: any; responses?: any; processedData?: any; embeddings?: any; metadata?: any; similarity?: any; processingTime?: any }).result?.processedData ? new Float32Array((result as { success?: any; result?: any; responses?: any; processedData?: any; embeddings?: any; metadata?: any; similarity?: any); processingTime?: any }).result.processedData) : undefined
          embeddings: (result as { success?: any; result?: any; responses?: any; processedData?: any; embeddings?: any; metadata?: any; similarity?: any; processingTime?: any }).result?.embeddings ? new Float32Array((result as { success?: any; result?: any; responses?: any; processedData?: any; embeddings?: any; metadata?: any; similarity?: any); processingTime?: any }).result.embeddings) : undefined
          metadata: (result as { success?: any; result?: any; responses?: any; processedData?: any; embeddings?: any; metadata?: any; similarity?: any; processingTime?: any }).result?.metadata,
          similarity: (result as { success?: any; result?: any; responses?: any; processedData?: any; embeddings?: any; metadata?: any; similarity?: any; processingTime?: any }).result?.similarity,
          processingTime: (result as { success?: any; result?: any; responses?: any; processedData?: any; embeddings?: any; metadata?: any; similarity?: any; processingTime?: any }).result?.processingTime
        },
        timestamp: new Date()
      }
    } catch (error) {
      return {
        id: request.id,
        success: false
        error: error instanceof Error ? error.message: 'Unknown error',
        timestamp: new Date()
      }
    }
  }
  // Batch process multiple tensors
  async processBatch(requests: TensorRequest[]): Promise<TensorResponse[]> {
    try {
      const response = await fetch(`,${this.baseUrl}/api/tensor/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({,
          requests: requests.map(req => ({
            ...req,
            data: req.data instanceof Float32Array ? Array.from(req.data) : req.data
          })
        })
      });
      if (!(response as { ok?: any; status?: any; statusText?: any; json?: any }).ok) {
        throw new Error(`,HTTP ${(response as { ok?: any; status?: any; statusText?: an,y); json?: any }).status}: ${(response as { ok?: any; status?: any; statusText?: any; json?: any }).statusText}`);
      }
      const result = await (response as { ok?: any; status?: any; statusText?: any; json?: any }).json();
      return (result as { success?: any; result?: any; responses?: any; processedData?: any; embeddings?: any; metadata?: any; similarity?: any; processingTime?: any }).responses.map((res: any) => ({,
        id: res.id,
        success: res.success,
        result: res.result ? {,
          processedData: res.result.processedData ? new Float32Array(res.result.processedData) : undefined
          embeddings: res.result.embeddings ? new Float32Array(res.result.embeddings) : undefined
          metadata: res.result.metadata,
          similarity: res.result.similarity,
          processingTime: res.result.processingTime
        } : undefined
        error: res.error,
        timestamp: new Date()
      });
    } catch (error) {
      // Return failed responses for all requests
      return requests.map(req => ({
        id: req.id,
        success: false
        error: error instanceof Error ? error.message: 'Batch processing failed',
        timestamp: new Date()
      });
    }
  }
  // Get service metrics
  async getMetrics(): Promise<Record<string>, a>>n>>y>> {
    try {
      const response = await fetch(`,${this.baseUrl}/metrics`, {
        method: 'GET',
        headers,: {
          'Content-Type',: 'application/json'
        }
      )});
      if (!(response as { ok?: any; status?: any; statusText?: any; json?: any }).ok) {
        throw new Error(`HTTP ${(response as { ok?: any; status?: any; statusText?: any,); json?: any }).status}: ${(response as { ok?: any; status?: any; statusText?: any; json?: any }).statusText}`);
      }
      return await (response as { ok?: any; status?: any; statusText?: any; json?: any }).json();
    } catch (error) {
      return {}
    }
  }
}
// WebSocket client for streaming tensor operations
class GoTensorWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectDelay = 5000;
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  constructor(url = 'ws://localhost:8095/ws/tensor') {
    this.url = url;
  }
  // Connect to WebSocket
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.ws.onopen = () => {
          console.log('Connected to Go tensor service via WebSocket');
          this.reconnectAttempts = 0);
          resolve();
        });
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        }
        this.ws.onclose = () => {
          console.log('WebSocket connection closed');
          this.attemptReconnect();
        });
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  // Send tensor request via WebSocket
  sendTensorRequest(request: TensorRequest): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'tensor_request',
        ...request,
        data: request.data instanceof Float32Array ? Array.from(request.data) : request.data
      }
      this.ws.send(JSON.stringify(message);
    } else {
      console.error('WebSocket not connected');
    }
  }
  // Handle incoming messages
  private handleMessage(data: any): void {
    const handlers = this.eventHandlers.get((data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any); error?: any }).type) || [];
    handlers.forEach(handler => handler(data);
  }
  // Add event listener
  on(_event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }
  // Remove event listener
  off(_event: string, handler: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  // Attempt reconnection
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {>
      this.reconnectAttempts++;
      console.log(`,Attempting to reconnect (,${th,is.reconnectAttempts,}/${,this.maxReconnectAttem,pts})...`);
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }
  // Disconnect
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
// Main service class
export class GoTensorServiceClient {
  private httpClient: GoTensorHTTPClient;
  private wsClient: GoTensorWebSocketClient;
  private isConnected = false;
  constructor(httpBaseUrl = 'http://localhost:8095', wsUrl = 'ws://localhost:8095/ws/tensor') {
    this.httpClient = new GoTensorHTTPClient(httpBaseUrl);
    this.wsClient = new GoTensorWebSocketClient(wsUrl);
  }
  // Initialize connection
  async init(): Promise<void> {
    try {
      // Test HTTP connection first
      const health = await this.httpClient.healthCheck();
      if (health.status === 'offline') {
        throw new Error('Go tensor service is not available');
      }
      // Initialize WebSocket connection
      await this.wsClient.connect();
      this.isConnected = true;
      console.log('Go tensor service client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Go tensor service client:', error);
      throw error;
    }
  }
  // Health check
  async healthCheck(): Promise<ServiceHealth> {
    return this.httpClient.healthCheck();
  }
  // Process single tensor (HTTP)
  async processTensor(request: TensorRequest): Promise<TensorResponse> {
    return this.httpClient.processTensor(request);
  }
  // Process batch tensors (HTTP)
  async processBatch(requests: TensorRequest[]): Promise<TensorResponse[]> {
    return this.httpClient.processBatch(requests);
  }
  // Stream tensor processing (WebSocket)
  streamTensor(request: TensorRequest, onResponse: (response: TensorResponse) => void): void {
    if (!this.isConnected) {
      console.error('WebSocket not connected');
      return;
    }
    // Listen for responses
    this.wsClient.on('tensor_response', (data) => {
      if ((data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).id === request.id) {
        const response: TensorResponse = {
          id: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).id,
          success: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).success,
          result: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).result ? {
            processedData: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).result.processedData ? new Float32Array((data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any); error?: any }).result.processedData) : undefined
            embeddings: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).result.embeddings ? new Float32Array((data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any); error?: any }).result.embeddings) : undefined
            metadata: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).result.metadata,
            similarity: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).result.similarity,
            processingTime: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).result.processingTime
          } : undefined
          error: (data as { version?: any; connections?: any; type?: any; id?: any; success?: any; result?: any; error?: any }).error,
          timestamp: new Date()
        }
        onResponse(response);
      }
    });
    // Send request
    this.wsClient.sendTensorRequest(request);
  }
  // Get service metrics
  async getMetrics(): Promise<Record<string>, a>>n>>y>> {
    return this.httpClient.getMetrics();
  }
  // Disconnect
  disconnect(): void {
    this.wsClient.disconnect();
    this.isConnected = false;
  }
}
// Singleton instance
export const goTensorService = new GoTensorServiceClient();
// Utility functions
export function generateTensorRequest()
  documentId: string
  data: number[] | Float32Array;
  operation: TensorRequest['operation'] = 'process';
): TensorRequest {
  return {
    id: `,tensor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    documentId,
    data,
    operation,
    options: {
      batchSize: 1,
      timeout: 10000,
      priority: 5
    }
  }
}
export function mockTensorData(dimensions: number = 768): Float32Array {
  return new Float32Array(Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
}