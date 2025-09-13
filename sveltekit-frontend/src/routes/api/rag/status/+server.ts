import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/*
 * RAG Status API - Returns system status for file processing pipeline
 * Now includes Docker Desktop and container health checks
 */

async function checkServiceHealth(url: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      method: 'GET'
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

async function checkDockerDesktop(): Promise<{ running: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execAsync('docker info --format "{{.ServerVersion}}"');
    return {
      running: true,
      version: stdout.trim()
    };
  } catch (error: any) {
    return {
      running: false,
      error: error.message || 'Docker Desktop not running'
    };
  }
}

async function checkDockerContainer(containerName: string): Promise<{ running: boolean; status?: string; error?: string }> {
  try {
    const { stdout } = await execAsync(`docker ps --filter "name=${containerName}" --format "{{.Status}}"`);
    const status = stdout.trim();
    return {
      running: status.toLowerCase().includes('up'),
      status: status || 'Not found'
    };
  } catch (error: any) {
    return {
      running: false,
      error: error.message || 'Container check failed'
    };
  }
}

async function checkPostgresHealth(host: string, port: number): Promise<boolean> {
  try {
    // Use psql command to check PostgreSQL connectivity
    const { stdout } = await execAsync(`PGPASSWORD=123456 psql -h ${host} -p ${port} -U legal_admin -d legal_ai_db -c "SELECT 1;" --quiet --tuples-only`);
    return stdout.trim() === '1';
  } catch (error: any) {
    // Try alternative Docker exec approach
    try {
      await execAsync('docker exec legal-ai-postgres pg_isready -U legal_admin -d legal_ai_db');
      return true;
    } catch {
      return false;
    }
  }
}

async function checkRedisHealth(host: string, port: number): Promise<boolean> {
  try {
    // Use redis-cli to ping Redis
    const { stdout } = await execAsync(`redis-cli -h ${host} -p ${port} ping`);
    return stdout.trim().toLowerCase() === 'pong';
  } catch (error: any) {
    // Try alternative Docker exec approach
    try {
      const { stdout } = await execAsync('docker exec legal-ai-redis redis-cli ping');
      return stdout.trim().toLowerCase() === 'pong';
    } catch {
      return false;
    }
  }
}

export const GET: RequestHandler = async () => {
  try {
    // Check Docker Desktop first
    const dockerDesktop = await checkDockerDesktop();

    // Check Docker containers (if Docker is running)
    let dockerContainers = {};
    if (dockerDesktop.running) {
      const [postgres, redis, qdrant, minio, rabbitmq] = await Promise.all([
        checkDockerContainer('legal-ai-postgres'),
        checkDockerContainer('legal-ai-redis'),
        checkDockerContainer('legal-ai-qdrant'),
        checkDockerContainer('legal-ai-minio'),
        checkDockerContainer('legal-ai-rabbitmq')
      ]);

      dockerContainers = {
        'legal-ai-postgres': postgres,
        'legal-ai-redis': redis,
        'legal-ai-qdrant': qdrant,
        'legal-ai-minio': minio,
        'legal-ai-rabbitmq': rabbitmq
      };
    }

    // Check service endpoints (Docker or native) with proper health check URLs
    const [postgresHealthy, redisHealthy, qdrantHealthy, embeddingsHealthy] = await Promise.all([
      checkPostgresHealth('localhost', 5433), // PostgreSQL requires special connection check
      checkRedisHealth('localhost', 6379), // Redis requires ping command
      checkServiceHealth('http://localhost:6333/collections'), // Qdrant HTTP API
      checkServiceHealth('http://localhost:11434/api/tags') // Ollama HTTP API
    ]);

    // Native file processing - always available
    const ocrHealthy = true;
    const storageHealthy = true; // Local file system
    const searchHealthy = true; // Built-in vector search

    const allServicesHealthy = postgresHealthy && redisHealthy && qdrantHealthy && embeddingsHealthy;

    const status = {
      overall: dockerDesktop.running && allServicesHealthy,
      docker: {
        desktop: dockerDesktop,
        containers: dockerContainers
      },
      services: {
        postgresql: {
          healthy: postgresHealthy,
          url: 'localhost:5433',
          type: 'docker-container'
        },
        redis: {
          healthy: redisHealthy,
          url: 'localhost:6379',
          type: 'docker-container'
        },
        qdrant: {
          healthy: qdrantHealthy,
          url: 'localhost:6333',
          type: 'docker-container'
        },
        embeddings: {
          healthy: embeddingsHealthy,
          url: 'http://localhost:11434',
          type: 'native-service'
        },
        ocr: {
          healthy: ocrHealthy,
          url: 'native-processing',
          type: 'native'
        },
        storage: {
          healthy: storageHealthy,
          url: 'file-system',
          type: 'native'
        },
        search: {
          healthy: searchHealthy,
          url: 'built-in',
          type: 'native'
        }
      },
      healthSummary: {
        totalServices: 7,
        healthyServices: [postgresHealthy, redisHealthy, qdrantHealthy, embeddingsHealthy, ocrHealthy, storageHealthy, searchHealthy].filter(Boolean).length,
        dockerRequired: true,
        dockerRunning: dockerDesktop.running
      },
      timestamp: new Date().toISOString()
    };

    return json(status);
  } catch (error: any) {
    return json(
      {
        error: 'Failed to check system status',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};
