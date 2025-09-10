/**
 * MCP Multi-Core Server API Integration
 * Real-time communication with the MCP server backend
 */

export class MCPApiClient {
  private baseUrl: string;
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(baseUrl = 'http://localhost:3001/mcp') {
    this.baseUrl = baseUrl;
  }

  // Health check endpoint
  async getHealth(): Promise<MCPHealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'error',
        uptime: 0,
        workers: 0,
        version: 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get server metrics
  async getMetrics(): Promise<MCPMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Metrics fetch failed:', error);
      return {
        cpu: 0,
        memory: 0,
        activeJobs: 0,
        completedJobs: 0,
        errorCount: 0,
        avgProcessingTime: 0,
        throughput: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get worker status
  async getWorkers(): Promise<MCPWorker[]> {
    try {
      const response = await fetch(`${this.baseUrl}/workers`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.workers || [];
    } catch (error) {
      console.error('Workers fetch failed:', error);
      return [];
    }
  }

  // Submit documents for processing
  async processDocuments(files: File[], options: ProcessingOptions = {}): Promise<MCPJobSubmission> {
    try {
      const formData = new FormData();

      files.forEach((file, index) => {
        formData.append(`document_${index}`, file);
      });

      formData.append('options', JSON.stringify(options));

      const response = await fetch(`${this.baseUrl}/process`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  }

  // Get job status
  async getJobStatus(jobId: string): Promise<MCPJob> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Job status fetch failed:', error);
      throw error;
    }
  }

  // Get job results
  async getJobResults(jobId: string): Promise<MCPJobResult> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}/results`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Job results fetch failed:', error);
      throw error;
    }
  }

  // Cancel a job
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}/cancel`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Job cancellation failed:', error);
      return false;
    }
  }

  // Real-time updates via WebSocket
  connectWebSocket(onMessage: (data: MCPRealtimeEvent) => void): void {
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws';

    try {
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('WebSocket connected to MCP server');
        this.reconnectAttempts = 0;
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect(onMessage);
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }

  private attemptReconnect(onMessage: (data: MCPRealtimeEvent) => void): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        console.log(`Reconnecting to WebSocket (attempt ${this.reconnectAttempts})`);
        this.connectWebSocket(onMessage);
      }, delay);
    }
  }

  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Restart server (admin function)
  async restartServer(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Server restart failed:', error);
      return false;
    }
  }

  // Get system logs
  async getLogs(limit = 100): Promise<MCPLogEntry[]> {
    try {
      const response = await fetch(`${this.baseUrl}/logs?limit=${limit}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.logs || [];
    } catch (error) {
      console.error('Logs fetch failed:', error);
      return [];
    }
  }

  // GPU status and metrics
  async getGPUStatus(): Promise<MCPGPUStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/gpu/status`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('GPU status fetch failed:', error);
      return {
        available: false,
        temperature: 0,
        memoryUsed: 0,
        memoryTotal: 0,
        powerUsage: 0,
        utilization: 0,
        name: 'Unknown'
      };
    }
  }
}

// Type definitions for MCP API
export interface MCPHealthStatus {
  status: 'healthy' | 'degraded' | 'error' | 'restarting';
  uptime: number;
  workers: number;
  version: string;
  timestamp: string;
}

export interface MCPMetrics {
  cpu: number;
  memory: number;
  activeJobs: number;
  completedJobs: number;
  errorCount: number;
  avgProcessingTime: number;
  throughput: number;
  timestamp: string;
}

export interface MCPWorker {
  id: number;
  status: 'idle' | 'busy' | 'error' | 'starting';
  currentJob?: string;
  jobsCompleted: number;
  avgResponseTime: number;
  lastActivity?: string;
  memoryUsage: number;
  cpuUsage: number;
}

export interface ProcessingOptions {
  mode?: 'parallel' | 'sequential';
  priority?: 'high' | 'normal' | 'low';
  gpu?: boolean;
  analysisType?: 'full' | 'summary' | 'entities' | 'compliance';
  outputFormat?: 'json' | 'xml' | 'text';
}

export interface MCPJobSubmission {
  jobId: string;
  status: 'submitted';
  estimatedTime: number;
  queuePosition: number;
  workers: number[];
}

export interface MCPJob {
  id: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'error' | 'cancelled';
  workerId?: number;
  progress: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  error?: string;
}

export interface MCPJobResult {
  jobId: string;
  filename: string;
  results: {
    summary: string;
    entities: LegalEntity[];
    riskAssessment: RiskAssessment;
    compliance: ComplianceCheck[];
    precedents: LegalPrecedent[];
    recommendations: string[];
    confidence: number;
  };
  metadata: {
    processingTime: number;
    workerId: number;
    modelVersion: string;
    documentType: string;
  };
}

export interface LegalEntity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'amount';
  confidence: number;
  context: string;
}

export interface RiskAssessment {
  overall: number;
  categories: {
    financial: number;
    legal: number;
    operational: number;
    regulatory: number;
  };
  factors: string[];
}

export interface ComplianceCheck {
  regulation: string;
  status: 'compliant' | 'non-compliant' | 'unclear';
  confidence: number;
  notes: string;
}

export interface LegalPrecedent {
  case: string;
  relevance: number;
  summary: string;
  citation: string;
}

export interface MCPRealtimeEvent {
  type: 'job_update' | 'worker_status' | 'metrics' | 'log' | 'alert';
  timestamp: string;
  data: any;
}

export interface MCPLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source: string;
  metadata?: any;
}

export interface MCPGPUStatus {
  available: boolean;
  name: string;
  temperature: number;
  memoryUsed: number;
  memoryTotal: number;
  powerUsage: number;
  utilization: number;
}

// Singleton instance for easy import
export const mcpApi = new MCPApiClient();
