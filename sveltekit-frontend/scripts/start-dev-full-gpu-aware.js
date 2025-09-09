#!/usr/bin/env node

/**
 * Enhanced dev:full script with GPU memory awareness
 * Optimized for RTX 3060 Ti and Legal AI workloads
 */

import { spawn } from 'child_process';
import { createServer } from 'net';
import GPUMemoryManager from './init-gpu-memory.js';
import chalk from 'chalk';

class DevFullManager {
  constructor() {
    this.processes = [];
    this.gpuManager = new GPUMemoryManager();
    this.isShuttingDown = false;
    this.discoveredPorts = {
      frontend: null,
      ollama: null,
      cuda: null
    };
  }

  log(service, message, color = 'white') {
    const timestamp = new Date().toLocaleTimeString();
    const serviceTag = `[${service}]`.padEnd(12);
    console.log(chalk[color](`${timestamp} ${serviceTag} ${message}`));
  }

  async findAvailablePort(startPort, maxAttempts = 100) {
    for (let port = startPort; port < startPort + maxAttempts; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available port found starting from ${startPort}`);
  }

  isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
  }

  async discoverPorts() {
    this.log('System', '🔍 Discovering available ports...', 'cyan');
    
    try {
      // Frontend port discovery (start from 5173)
      this.discoveredPorts.frontend = await this.findAvailablePort(5173);
      this.log('System', `📍 Frontend port: ${this.discoveredPorts.frontend}`, 'cyan');
      
      // Ollama port discovery (start from 11434)
      this.discoveredPorts.ollama = await this.findAvailablePort(11434);
      this.log('System', `📍 Ollama port: ${this.discoveredPorts.ollama}`, 'yellow');
      
      // CUDA service port discovery (start from 8080)
      this.discoveredPorts.cuda = await this.findAvailablePort(8080);
      this.log('System', `📍 CUDA service port: ${this.discoveredPorts.cuda}`, 'magenta');
      
      this.log('System', '✅ Port discovery complete', 'green');
      
    } catch (error) {
      this.log('System', `❌ Port discovery failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async initializeGPU() {
    this.log('GPU', '🚀 Initializing GPU memory management...', 'magenta');
    
    const envVars = await this.gpuManager.initializeGPUMemory();
    await this.gpuManager.warmupGPU();
    
    // Apply environment variables to current process
    for (const [key, value] of Object.entries(envVars)) {
      process.env[key] = value;
    }
    
    this.log('GPU', '✅ GPU initialization complete', 'green');
    return envVars;
  }

  async startPostgreSQL() {
    this.log('PostgreSQL', '🐘 Checking Docker PostgreSQL status...', 'blue');
    
    try {
      // Check if Docker PostgreSQL is running
      const testProcess = spawn('docker', ['exec', 'legal-ai-postgres', 'pg_isready', '-h', 'localhost', '-p', '5432'], {
        stdio: 'pipe'
      });
      
      testProcess.on('close', (code) => {
        if (code === 0) {
          this.log('PostgreSQL', '✅ Docker PostgreSQL (legal-ai-postgres) is running', 'green');
        } else {
          this.log('PostgreSQL', '⚠️  Docker PostgreSQL not responding, checking container...', 'yellow');
          // Check if container is running
          const checkContainer = spawn('docker', ['ps', '--filter', 'name=legal-ai-postgres', '--format', '{{.Names}}'], {
            stdio: 'pipe'
          });
          
          checkContainer.stdout.on('data', (data) => {
            if (data.toString().includes('legal-ai-postgres')) {
              this.log('PostgreSQL', '✅ Container running, connection will be established', 'green');
            } else {
              this.log('PostgreSQL', '⚠️  Container not running, please start Docker stack', 'yellow');
            }
          });
        }
      });
    } catch (error) {
      this.log('PostgreSQL', `❌ Error checking Docker PostgreSQL: ${error.message}`, 'red');
    }
  }

  async checkDockerDesktop() {
    this.log('Docker', '🔍 Checking Docker Desktop status...', 'cyan');
    
    try {
      // Check if Docker is running using docker info
      const dockerInfoProcess = spawn('docker', ['info'], {
        stdio: 'pipe'
      });
      
      return new Promise((resolve) => {
        let dockerRunning = false;
        
        dockerInfoProcess.on('close', async (code) => {
          if (code === 0) {
            this.log('Docker', '✅ Docker Desktop is running', 'green');
            dockerRunning = true;
            resolve();
          } else {
            this.log('Docker', '❌ Docker Desktop is not running', 'red');
            this.log('Docker', '🚀 Attempting to start Docker services with compose...', 'yellow');
            
            try {
              await this.startDockerCompose();
              resolve();
            } catch (error) {
              this.log('Docker', `❌ Failed to start Docker services: ${error.message}`, 'red');
              this.log('Docker', '💡 Please start Docker Desktop manually', 'yellow');
              resolve(); // Continue anyway, individual service checks will catch issues
            }
          }
        });
        
        dockerInfoProcess.stderr.on('data', (data) => {
          const error = data.toString().trim();
          if (error.includes('docker daemon is not running') || 
              error.includes('connect: no such file or directory') ||
              error.includes('cannot connect to the Docker daemon')) {
            // Docker is not running
          }
        });
      });
    } catch (error) {
      this.log('Docker', `❌ Error checking Docker Desktop: ${error.message}`, 'red');
      this.log('Docker', '💡 Please ensure Docker Desktop is installed', 'yellow');
    }
  }

  async startDockerCompose() {
    this.log('Docker', '🐳 Starting Docker Compose services...', 'cyan');
    
    // Navigate to project root (one level up from sveltekit-frontend)
    const projectRoot = '..';
    
    const composeProcess = spawn('docker', ['compose', 'up', '-d'], {
      stdio: 'pipe',
      cwd: projectRoot
    });
    
    return new Promise((resolve, reject) => {
      composeProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        this.log('Docker', `📋 ${output}`, 'cyan');
      });
      
      composeProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        if (error.includes('error') || error.includes('failed')) {
          this.log('Docker', `⚠️  ${error}`, 'yellow');
        } else {
          this.log('Docker', `📋 ${error}`, 'cyan');
        }
      });
      
      composeProcess.on('close', (code) => {
        if (code === 0) {
          this.log('Docker', '✅ Docker Compose services started successfully', 'green');
          this.log('Docker', '⏳ Waiting for services to be ready...', 'yellow');
          // Give services time to start up
          setTimeout(() => resolve(), 5000);
        } else {
          reject(new Error(`Docker Compose failed with exit code ${code}`));
        }
      });
    });
  }

  async checkDockerServices() {
    this.log('Docker', '🐳 Checking Docker services...', 'cyan');
    
    const services = [
      { name: 'PostgreSQL', container: 'legal-ai-postgres', port: '5433→5432' },
      { name: 'Redis', container: 'legal-ai-redis', port: '6379' },
      { name: 'RabbitMQ', container: 'legal-ai-rabbitmq', port: '5672,15672' },
      { name: 'MinIO', container: 'legal-ai-minio', port: '9000-9001' },
      { name: 'Qdrant', container: 'legal-ai-qdrant', port: '6333-6334' }
    ];

    for (const service of services) {
      try {
        const checkProcess = spawn('docker', ['ps', '--filter', `name=${service.container}`, '--format', '{{.Status}}'], {
          stdio: 'pipe'
        });

        checkProcess.stdout.on('data', (data) => {
          const status = data.toString().trim();
          if (status.includes('Up')) {
            this.log('Docker', `✅ ${service.name} (${service.container}) → ${service.port}`, 'green');
          } else if (status) {
            this.log('Docker', `⚠️  ${service.name} (${service.container}) → ${status}`, 'yellow');
          } else {
            this.log('Docker', `❌ ${service.name} container not found`, 'red');
          }
        });
      } catch (error) {
        this.log('Docker', `❌ Error checking ${service.name}: ${error.message}`, 'red');
      }
    }
  }

  async startCUDAService() {
    this.log('CUDA', '🎯 Starting CUDA service worker...', 'magenta');
    
    const cudaProcess = spawn('go', ['run', '../cuda-service-worker.go'], {
      stdio: 'pipe',
      env: { ...process.env }
    });
    
    cudaProcess.stdout.on('data', (data) => {
      this.log('CUDA', data.toString().trim(), 'magenta');
    });
    
    cudaProcess.stderr.on('data', (data) => {
      this.log('CUDA', `⚠️  ${data.toString().trim()}`, 'yellow');
    });
    
    cudaProcess.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        this.log('CUDA', `❌ CUDA service exited with code ${code}`, 'red');
      }
    });
    
    this.processes.push(cudaProcess);
    return cudaProcess;
  }

  async startFrontend() {
    this.log('Frontend', '🖥️  Starting SvelteKit frontend with WebSocket support...', 'cyan');
    
    const frontendPort = this.discoveredPorts.frontend;
    this.log('Frontend', `🔌 Using port ${frontendPort} for WebSocket integration`, 'magenta');
    
    // Use Node.js directly to run the Vite dev server with proper path quoting
    const frontendProcess = spawn(`"${process.execPath}"`, ['node_modules/vite/bin/vite.js', 'dev', '--port', frontendPort.toString(), '--host'], {
      stdio: 'pipe',
      shell: true,
      env: { 
        ...process.env,
        WEBSOCKET_ENABLED: 'true',
        BINARY_QLORA_WS: 'true',
        PORT: frontendPort.toString()
      }
    });
    
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('ready in')) {
        this.log('Frontend', `✅ ${output}`, 'green');
      } else if (output.includes('Local:')) {
        this.log('Frontend', `🌐 ${output}`, 'cyan');
      } else if (output.includes('WebSocket')) {
        this.log('Frontend', `🔌 ${output}`, 'magenta');
      } else if (output.includes('Binary QLoRA')) {
        this.log('Frontend', `⚡ ${output}`, 'yellow');
      } else if (output.includes('error')) {
        this.log('Frontend', `❌ ${output}`, 'red');
      } else {
        this.log('Frontend', output, 'white');
      }
    });
    
    frontendProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error.includes('EADDRINUSE')) {
        this.log('Frontend', '⚠️  Port in use, trying next available port...', 'yellow');
      } else {
        this.log('Frontend', `⚠️  ${error}`, 'yellow');
      }
    });
    
    frontendProcess.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        this.log('Frontend', `❌ Frontend exited with code ${code}`, 'red');
      }
    });
    
    this.processes.push(frontendProcess);
    return frontendProcess;
  }

  async startOllama() {
    this.log('Ollama', '🤖 Starting Ollama AI service...', 'yellow');
    
    const ollamaPort = this.discoveredPorts.ollama;
    this.log('Ollama', `📍 Using port ${ollamaPort}`, 'yellow');
    
    const ollamaProcess = spawn('ollama', ['serve'], {
      stdio: 'pipe',
      env: { 
        ...process.env,
        OLLAMA_HOST: `0.0.0.0:${ollamaPort}`
      }
    });
    
    ollamaProcess.stdout.on('data', (data) => {
      this.log('Ollama', data.toString().trim(), 'yellow');
    });
    
    ollamaProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error.includes('server already running')) {
        this.log('Ollama', '✅ Ollama server already running', 'green');
      } else {
        this.log('Ollama', `⚠️  ${error}`, 'yellow');
      }
    });
    
    ollamaProcess.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        this.log('Ollama', `❌ Ollama service exited with code ${code}`, 'red');
      }
    });
    
    this.processes.push(ollamaProcess);
    return ollamaProcess;
  }

  async startRedis() {
    this.log('Redis', '🔴 Starting Redis cache server...', 'red');
    
    const redisProcess = spawn('node', ['scripts/start-redis.js'], {
      stdio: 'pipe',
      env: { ...process.env }
    });
    
    redisProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('ready to accept connections')) {
        this.log('Redis', '✅ Redis server ready', 'green');
      } else if (output.includes('bind:')) {
        this.log('Redis', '⚠️  Redis port conflict, trying alternate port...', 'yellow');
      } else {
        this.log('Redis', output, 'red');
      }
    });
    
    redisProcess.stderr.on('data', (data) => {
      this.log('Redis', `⚠️  ${data.toString().trim()}`, 'yellow');
    });
    
    this.processes.push(redisProcess);
    return redisProcess;
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      this.isShuttingDown = true;
      this.log('System', `📴 Received ${signal}, shutting down services...`, 'yellow');
      
      // Kill all processes
      for (const process of this.processes) {
        if (process && !process.killed) {
          process.kill();
        }
      }
      
      // Give processes time to cleanup
      setTimeout(() => {
        this.log('System', '✅ All services stopped', 'green');
        process.exit(0);
      }, 2000);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('beforeExit', () => shutdown('beforeExit'));
  }

  async start() {
    this.log('System', '🚀 Starting Legal AI Full Development Stack...', 'green');
    this.log('System', '📋 Services: Docker Stack + CUDA + Frontend + Ollama', 'white');
    this.log('System', '🔌 WebSocket: Binary QLoRA streaming with real-time compression', 'magenta');
    
    try {
      // Check if Docker Desktop is running first
      await this.checkDockerDesktop();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Docker startup
      
      // Check Docker services
      await this.checkDockerServices();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Docker check
      
      // Discover available ports
      await this.discoverPorts();
      
      // Initialize GPU memory management
      await this.initializeGPU();
      
      // Start services in optimal order
      await this.startPostgreSQL();
      await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for PostgreSQL
      
      await this.startRedis();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Redis
      
      await this.startCUDAService();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for CUDA
      
      await this.startOllama();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Ollama
      
      await this.startFrontend();
      
      this.log('System', '✅ All services started successfully!', 'green');
      this.log('System', '🌐 Frontend available at: http://localhost:' + this.discoveredPorts.frontend, 'cyan');
      this.log('System', '🧪 pgvector test: http://localhost:' + this.discoveredPorts.frontend + '/dev/pgvector-test', 'cyan');
      this.log('System', '🔌 WebSocket API: ws://localhost:' + this.discoveredPorts.frontend + '/websocket', 'magenta');
      this.log('System', '⚡ Binary QLoRA: http://localhost:' + this.discoveredPorts.frontend + '/api/ai/qlora-topology', 'yellow');
      this.log('System', '🤖 Ollama API: http://localhost:' + this.discoveredPorts.ollama, 'yellow');
      this.log('System', '🎯 CUDA Service: http://localhost:' + this.discoveredPorts.cuda, 'magenta');
      this.log('System', '', 'white');
      this.log('System', '🐳 Docker Services:', 'cyan');
      this.log('System', '🐘 PostgreSQL: http://localhost:5433 (legal-ai-postgres)', 'blue');
      this.log('System', '🔴 Redis: http://localhost:6379 (legal-ai-redis)', 'red');
      this.log('System', '🐰 RabbitMQ: http://localhost:15672 (legal-ai-rabbitmq)', 'yellow');
      this.log('System', '📦 MinIO: http://localhost:9001 (legal-ai-minio)', 'green');
      this.log('System', '🔍 Qdrant: http://localhost:6333 (legal-ai-qdrant)', 'magenta');
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      this.log('System', `❌ Failed to start services: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Start the development stack
const devManager = new DevFullManager();
devManager.start().catch(console.error);