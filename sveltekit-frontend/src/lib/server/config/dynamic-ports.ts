// Dynamic Port Management System
// Provides port arrays [0-9] for each service to avoid conflicts

import { createServer } from 'net';

export interface ServicePort {
  name: string;
  basePort: number;
  currentPort?: number;
  alternative?: number;
  portRange: number[];
}

export class DynamicPortManager {
  private services: Map<string, ServicePort> = new Map();
  private usedPorts: Set<number> = new Set();

  constructor() {
    this.initializeServicePorts();
  }

  private initializeServicePorts() {
    // Define base port ranges for each service with [0-9] alternatives
    const serviceDefinitions: ServicePort[] = [
      // Frontend Services (5170-5179)
      { name: 'vite-dev', basePort: 5174, portRange: [5170, 5171, 5172, 5173, 5174, 5175, 5176, 5177, 5178, 5179] },
      
      // Database Services (5430-5439)
      { name: 'postgresql', basePort: 5433, portRange: [5430, 5431, 5432, 5433, 5434, 5435, 5436, 5437, 5438, 5439] },
      
      // Redis Services (6370-6379)
      { name: 'redis', basePort: 6379, portRange: [6370, 6371, 6372, 6373, 6374, 6375, 6376, 6377, 6378, 6379] },
      
      // Neo4j Services (7680-7689)
      { name: 'neo4j', basePort: 7687, portRange: [7680, 7681, 7682, 7683, 7684, 7685, 7686, 7687, 7688, 7689] },
      
      // Go Microservices (8090-8099)
      { name: 'legal-gateway', basePort: 8080, portRange: [8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089] },
      { name: 'evidence-processor', basePort: 8090, portRange: [8090, 8091, 8092, 8093, 8094, 8095, 8096, 8097, 8098, 8099] },
      
      // Enhanced RAG Services (8100-8109)
      { name: 'enhanced-rag', basePort: 8094, portRange: [8100, 8101, 8102, 8103, 8104, 8105, 8106, 8107, 8108, 8109] },
      { name: 'gpu-orchestrator', basePort: 8095, portRange: [8110, 8111, 8112, 8113, 8114, 8115, 8116, 8117, 8118, 8119] },
      
      // Vector Services (8120-8129)
      { name: 'vector-consumer', basePort: 8095, portRange: [8120, 8121, 8122, 8123, 8124, 8125, 8126, 8127, 8128, 8129] },
      { name: 'binary-vector-engine', basePort: 8091, portRange: [8130, 8131, 8132, 8133, 8134, 8135, 8136, 8137, 8138, 8139] },
      
      // QUIC Services (8440-8449)
      { name: 'quic-gateway', basePort: 8443, portRange: [8440, 8441, 8442, 8443, 8444, 8445, 8446, 8447, 8448, 8449] },
      
      // MCP Services (4100-4109)
      { name: 'context7-multicore', basePort: 4100, portRange: [4100, 4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108, 4109] },
      { name: 'ai-synthesis-mcp', basePort: 8200, portRange: [8200, 8201, 8202, 8203, 8204, 8205, 8206, 8207, 8208, 8209] },
      
      // Ollama Services (11430-11439)
      { name: 'ollama', basePort: 11434, portRange: [11430, 11431, 11432, 11433, 11434, 11435, 11436, 11437, 11438, 11439] },
      
      // MinIO Services (9000-9009)
      { name: 'minio-api', basePort: 9000, portRange: [9000, 9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009] },
      { name: 'minio-console', basePort: 9001, portRange: [9010, 9011, 9012, 9013, 9014, 9015, 9016, 9017, 9018, 9019] },
      
      // RabbitMQ Services (15670-15679)
      { name: 'rabbitmq-amqp', basePort: 5672, portRange: [5670, 5671, 5672, 5673, 5674, 5675, 5676, 5677, 5678, 5679] },
      { name: 'rabbitmq-management', basePort: 15672, portRange: [15670, 15671, 15672, 15673, 15674, 15675, 15676, 15677, 15678, 15679] },
      
      // Qdrant Services (6330-6339)
      { name: 'qdrant', basePort: 6333, portRange: [6330, 6331, 6332, 6333, 6334, 6335, 6336, 6337, 6338, 6339] },
      
      // Load Balancer Services (3000-3009)
      { name: 'load-balancer', basePort: 3000, portRange: [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009] },
      
      // Health Check Services (9090-9099)
      { name: 'health-server', basePort: 9090, portRange: [9090, 9091, 9092, 9093, 9094, 9095, 9096, 9097, 9098, 9099] },
    ];

    serviceDefinitions.forEach(service => {
      this.services.set(service.name, service);
    });
  }

  async findAvailablePort(serviceName: string): Promise<number> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in port manager`);
    }

    // Try ports in order: basePort first, then alternatives
    const portsToTry = [service.basePort, ...service.portRange.filter(p => p !== service.basePort)];
    
    for (const port of portsToTry) {
      if (!this.usedPorts.has(port) && await this.isPortAvailable(port)) {
        this.usedPorts.add(port);
        service.currentPort = port;
        console.log(`🔌 [${serviceName}] Allocated port: ${port}`);
        return port;
      }
    }

    throw new Error(`No available ports found for service ${serviceName} in range [${service.portRange.join(', ')}]`);
  }

  async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }

  releasePort(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service && service.currentPort) {
      this.usedPorts.delete(service.currentPort);
      console.log(`🔓 [${serviceName}] Released port: ${service.currentPort}`);
      service.currentPort = undefined;
    }
  }

  getServicePort(serviceName: string): number | undefined {
    return this.services.get(serviceName)?.currentPort;
  }

  getAllocatedPorts(): Map<string, number> {
    const allocated = new Map<string, number>();
    this.services.forEach((service, name) => {
      if (service.currentPort) {
        allocated.set(name, service.currentPort);
      }
    });
    return allocated;
  }

  getServiceInfo(serviceName: string): ServicePort | undefined {
    return this.services.get(serviceName);
  }

  // Get environment variables with dynamic ports
  getEnvConfig(): Record<string, string> {
    const config: Record<string, string> = {};
    
    this.services.forEach((service, name) => {
      const port = service.currentPort || service.basePort;
      const envName = name.toUpperCase().replace(/-/g, '_') + '_PORT';
      config[envName] = port.toString();
    });

    return config;
  }

  // Generate service URLs
  getServiceUrls(): Record<string, string> {
    const urls: Record<string, string> = {};
    
    this.services.forEach((service, name) => {
      const port = service.currentPort || service.basePort;
      
      // Determine protocol based on service type
      let protocol = 'http';
      let host = 'localhost';
      
      if (name.includes('quic')) {
        protocol = 'quic';
      } else if (name.includes('postgresql')) {
        protocol = 'postgresql';
      } else if (name.includes('redis')) {
        protocol = 'redis';
      } else if (name.includes('neo4j')) {
        protocol = 'bolt';
      }
      
      urls[name] = `${protocol}://${host}:${port}`;
    });

    return urls;
  }

  // Initialize all services and find available ports
  async initializeAllServices(): Promise<Map<string, number>> {
    const allocated = new Map<string, number>();
    
    for (const [serviceName] of this.services) {
      try {
        const port = await this.findAvailablePort(serviceName);
        allocated.set(serviceName, port);
      } catch (error) {
        console.warn(`⚠️ Could not allocate port for ${serviceName}:`, error);
      }
    }
    
    return allocated;
  }

  // Display port allocation summary
  displayPortAllocation(): void {
    console.log('\n🔌 Dynamic Port Allocation Summary:');
    console.log('═'.repeat(50));
    
    this.services.forEach((service, name) => {
      const status = service.currentPort ? '✅' : '❌';
      const port = service.currentPort || 'N/A';
      const range = `[${service.portRange[0]}-${service.portRange[service.portRange.length - 1]}]`;
      
      console.log(`${status} ${name.padEnd(20)} ${port.toString().padEnd(6)} ${range}`);
    });
    
    console.log('═'.repeat(50));
    console.log(`Total services: ${this.services.size}`);
    console.log(`Allocated ports: ${Array.from(this.usedPorts).length}`);
  }
}

// Singleton instance
export const portManager = new DynamicPortManager();

// Helper functions for common operations
export async function allocateServicePort(serviceName: string): Promise<number> {
  return portManager.findAvailablePort(serviceName);
}

export function getServicePort(serviceName: string): number | undefined {
  return portManager.getServicePort(serviceName);
}

export function releaseServicePort(serviceName: string): void {
  portManager.releasePort(serviceName);
}

export async function initializeAllPorts(): Promise<Map<string, number>> {
  return portManager.initializeAllServices();
}

export function getPortEnvironment(): Record<string, string> {
  return portManager.getEnvConfig();
}

export function getServiceUrls(): Record<string, string> {
  return portManager.getServiceUrls();
}

// Enhanced error handling
export class PortAllocationError extends Error {
  constructor(serviceName: string, attempted: number[]) {
    super(`Failed to allocate port for service ${serviceName}. Attempted ports: ${attempted.join(', ')}`);
    this.name = 'PortAllocationError';
  }
}

// Port health check utility
export async function checkPortHealth(port: number): Promise<boolean> {
  return portManager.isPortAvailable(port);
}

// Conflict resolution
export async function resolvePortConflicts(): Promise<void> {
  console.log('🔍 Checking for port conflicts...');
  
  const conflicts: string[] = [];
  
  for (const [serviceName, service] of portManager.services) {
    if (service.currentPort && !await portManager.isPortAvailable(service.currentPort)) {
      conflicts.push(serviceName);
    }
  }
  
  if (conflicts.length > 0) {
    console.log(`⚠️ Found conflicts for services: ${conflicts.join(', ')}`);
    
    for (const serviceName of conflicts) {
      portManager.releasePort(serviceName);
      await portManager.findAvailablePort(serviceName);
    }
    
    console.log('✅ Port conflicts resolved');
  } else {
    console.log('✅ No port conflicts detected');
  }
}