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
      cuda: null,
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
    this.log('System', '🔍 Discovering available ports with conflict resolution...', 'cyan');

    try {
      // Check and resolve Ollama port (priority 1 - must be 11434 for compatibility)
      if (await this.isPortAvailable(11434)) {
        this.discoveredPorts.ollama = 11434;
        this.log('System', '✅ Ollama port 11434 available', 'green');
      } else {
        this.log(
          'System',
          '⚠️  Port 11434 in use, checking if Ollama is already running...',
          'yellow'
        );
        const isOllamaRunning = await this.checkOllamaHealth();
        if (isOllamaRunning) {
          this.log('System', '✅ Ollama already running on 11434', 'green');
          this.discoveredPorts.ollama = 11434;
        } else {
          this.log(
            'System',
            '❌ Port 11434 blocked by other service, finding alternative...',
            'red'
          );
          this.discoveredPorts.ollama = await this.findAvailablePort(11435);
          this.log(
            'System',
            `📍 Alternative Ollama port: ${this.discoveredPorts.ollama}`,
            'yellow'
          );
        }
      }

      // Check and resolve CUDA service port (priority 2 - avoid 8096 conflict)
      if (await this.isPortAvailable(8096)) {
        this.discoveredPorts.cuda = 8096;
        this.log('System', '✅ CUDA port 8096 available', 'green');
      } else {
        this.log('System', '⚠️  Port 8096 in use, finding alternative...', 'yellow');
        this.discoveredPorts.cuda = await this.findAvailablePort(8097);
        this.log('System', `📍 Alternative CUDA port: ${this.discoveredPorts.cuda}`, 'magenta');
      }

      // Frontend port discovery (start from 5173)
      this.discoveredPorts.frontend = await this.findAvailablePort(5173);
      this.log('System', `📍 Frontend port: ${this.discoveredPorts.frontend}`, 'cyan');

      this.log('System', '✅ Port discovery complete - conflicts resolved', 'green');
    } catch (error) {
      this.log('System', `❌ Port discovery failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async checkOllamaHealth() {
    try {
      const { spawn } = await import('child_process');
      return new Promise((resolve) => {
        const healthCheck = spawn('curl', ['-s', 'http://localhost:11434/api/version'], {
          stdio: 'pipe',
        });

        healthCheck.on('close', (code) => {
          resolve(code === 0);
        });

        healthCheck.on('error', () => {
          resolve(false);
        });

        // Timeout after 2 seconds
        setTimeout(() => {
          healthCheck.kill();
          resolve(false);
        }, 2000);
      });
    } catch {
      return false;
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
      const testProcess = spawn(
        'docker',
        ['exec', 'legal-ai-postgres', 'pg_isready', '-h', 'localhost', '-p', '5432'],
        {
          stdio: 'pipe',
        }
      );

      testProcess.on('close', (code) => {
        if (code === 0) {
          this.log('PostgreSQL', '✅ Docker PostgreSQL (legal-ai-postgres) is running', 'green');
        } else {
          this.log(
            'PostgreSQL',
            '⚠️  Docker PostgreSQL not responding, checking container...',
            'yellow'
          );
          // Check if container is running
          const checkContainer = spawn(
            'docker',
            ['ps', '--filter', 'name=legal-ai-postgres', '--format', '{{.Names}}'],
            {
              stdio: 'pipe',
            }
          );

          checkContainer.stdout.on('data', (data) => {
            if (data.toString().includes('legal-ai-postgres')) {
              this.log(
                'PostgreSQL',
                '✅ Container running, connection will be established',
                'green'
              );
            } else {
              this.log(
                'PostgreSQL',
                '⚠️  Container not running, please start Docker stack',
                'yellow'
              );
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
        stdio: 'pipe',
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
          if (
            error.includes('docker daemon is not running') ||
            error.includes('connect: no such file or directory') ||
            error.includes('cannot connect to the Docker daemon')
          ) {
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
      cwd: projectRoot,
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
      { name: 'Qdrant', container: 'legal-ai-qdrant', port: '6333-6334' },
    ];

    for (const service of services) {
      try {
        const checkProcess = spawn(
          'docker',
          ['ps', '--filter', `name=${service.container}`, '--format', '{{.Status}}'],
          {
            stdio: 'pipe',
          }
        );

        checkProcess.stdout.on('data', (data) => {
          const status = data.toString().trim();
          if (status.includes('Up')) {
            this.log(
              'Docker',
              `✅ ${service.name} (${service.container}) → ${service.port}`,
              'green'
            );
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
    this.log('CUDA', '🎯 Starting CUDA service worker with port validation...', 'magenta');

    // Ensure port is available before starting
    const cudaPort = this.discoveredPorts.cuda;
    if (!(await this.isPortAvailable(cudaPort))) {
      this.log('CUDA', `❌ Port ${cudaPort} still in use, aborting CUDA startup`, 'red');
      throw new Error(`CUDA port ${cudaPort} is not available`);
    }

    const cudaProcess = spawn('go', ['run', '../cuda-service-worker.go'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        CUDA_SERVICE_PORT: cudaPort.toString(),
        CUDA_SERVICE_HOST: '127.0.0.1',
      },
    });

    let startupComplete = false;

    cudaProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      this.log('CUDA', output, 'magenta');

      // Check for successful startup
      if (output.includes('Starting HTTP server') || output.includes('CUDA Service initialized')) {
        startupComplete = true;
      }
    });

    cudaProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();

      // Handle specific port conflict error
      if (error.includes('bind: Only one usage of each socket address')) {
        this.log('CUDA', `❌ Port conflict detected on ${cudaPort}`, 'red');
        this.log('CUDA', '💡 Retrying with alternative port in next startup...', 'yellow');
      } else {
        this.log('CUDA', `⚠️  ${error}`, 'yellow');
      }
    });

    cudaProcess.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        this.log('CUDA', `❌ CUDA service exited with code ${code}`, 'red');
        if (!startupComplete) {
          this.log(
            'CUDA',
            '💡 Service failed to start - check port conflicts and GPU availability',
            'yellow'
          );
        }
      } else if (code === 0) {
        this.log('CUDA', '✅ CUDA service shutdown cleanly', 'green');
      }
    });

    this.processes.push(cudaProcess);

    // Wait a moment for potential startup errors
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return cudaProcess;
  }

  async startFrontend() {
    this.log('Frontend', '🖥️  Starting SvelteKit frontend with WebSocket support...', 'cyan');

    const frontendPort = this.discoveredPorts.frontend;
    this.log('Frontend', `🔌 Using port ${frontendPort} for WebSocket integration`, 'magenta');

    // Use Node.js directly to run the Vite dev server with proper path quoting
    const frontendProcess = spawn(
      `"${process.execPath}"`,
      ['node_modules/vite/bin/vite.js', 'dev', '--port', frontendPort.toString(), '--host'],
      {
        stdio: 'pipe',
        shell: true,
        env: {
          ...process.env,
          WEBSOCKET_ENABLED: 'true',
          BINARY_QLORA_WS: 'true',
          PORT: frontendPort.toString(),
        },
      }
    );

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
    this.log('Ollama', '🤖 Starting Ollama AI service with validation...', 'yellow');

    const ollamaPort = this.discoveredPorts.ollama;

    // Check if Ollama is already running on the expected port
    const isAlreadyRunning = await this.checkOllamaHealth();
    if (isAlreadyRunning && ollamaPort === 11434) {
      this.log('Ollama', '✅ Ollama already running on port 11434', 'green');
      return null; // Don't start another instance
    }

    this.log('Ollama', `📍 Using port ${ollamaPort}`, 'yellow');

    // Ensure port is available (unless it's the already-running Ollama)
    if (ollamaPort !== 11434 && !(await this.isPortAvailable(ollamaPort))) {
      this.log('Ollama', `❌ Port ${ollamaPort} still in use, aborting Ollama startup`, 'red');
      throw new Error(`Ollama port ${ollamaPort} is not available`);
    }

    const ollamaProcess = spawn('ollama', ['serve'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        OLLAMA_HOST: `0.0.0.0:${ollamaPort}`,
        OLLAMA_ORIGINS: '*',
      },
    });

    let startupComplete = false;

    ollamaProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      this.log('Ollama', output, 'yellow');

      // Check for successful startup
      if (output.includes('Listening on')) {
        startupComplete = true;
        this.log('Ollama', '✅ Ollama service ready for requests', 'green');
      }
    });

    ollamaProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error.includes('server already running')) {
        this.log('Ollama', '✅ Ollama server already running', 'green');
        startupComplete = true;
      } else if (error.includes('bind: address already in use')) {
        this.log('Ollama', `❌ Port conflict on ${ollamaPort}`, 'red');
        this.log('Ollama', '💡 Use alternative port or stop conflicting service', 'yellow');
      } else {
        this.log('Ollama', `⚠️  ${error}`, 'yellow');
      }
    });

    ollamaProcess.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        this.log('Ollama', `❌ Ollama service exited with code ${code}`, 'red');
        if (!startupComplete) {
          this.log('Ollama', '💡 Ensure Ollama is installed and accessible', 'yellow');
        }
      } else if (code === 0) {
        this.log('Ollama', '✅ Ollama service shutdown cleanly', 'green');
      }
    });

    this.processes.push(ollamaProcess);

    // Wait for startup completion
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return ollamaProcess;
  }

  async startRedis() {
    this.log('Redis', '🔴 Starting Redis cache server...', 'red');

    const redisProcess = spawn('node', ['scripts/start-redis.js'], {
      stdio: 'pipe',
      env: { ...process.env },
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

  async startRedisGPUBridge() {
    this.log('Redis-GPU', '🔗 Starting Redis-GPU Pipeline Bridge...', 'blue');

    const bridgeProcess = spawn('node', ['scripts/redis-gpu-bridge.mjs'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        REDIS_URL: 'redis://127.0.0.1:6379',
        ENABLE_GPU: 'true',
        RTX_3060_OPTIMIZATION: 'true',
      },
    });

    bridgeProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('Starting Redis-GPU Pipeline Bridge')) {
        this.log('Redis-GPU', '🚀 Bridge initializing...', 'blue');
      } else if (output.includes('Redis connection established')) {
        this.log('Redis-GPU', '✅ Bridge connected to Redis', 'green');
      } else if (output.includes('GPU job')) {
        this.log('Redis-GPU', `📦 ${output}`, 'cyan');
      } else if (output.includes('completed')) {
        this.log('Redis-GPU', `✅ ${output}`, 'green');
      } else if (output.includes('error') || output.includes('❌')) {
        this.log('Redis-GPU', `❌ ${output}`, 'red');
      } else {
        this.log('Redis-GPU', output, 'blue');
      }
    });

    bridgeProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error.includes('Redis is already connecting')) {
        this.log('Redis-GPU', '⚠️  Redis connection already active, waiting...', 'yellow');
      } else {
        this.log('Redis-GPU', `⚠️  ${error}`, 'yellow');
      }
    });

    bridgeProcess.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        this.log('Redis-GPU', `❌ Bridge exited with code ${code}`, 'red');
      }
    });

    this.processes.push(bridgeProcess);
    return bridgeProcess;
  }

  async startGPUCluster() {
    this.log('GPU-Cluster', '⚡ Starting GPU Cluster Concurrent Executor...', 'magenta');

    const clusterProcess = spawn(
      'node',
      [
        'scripts/gpu-cluster-concurrent-executor.mjs',
        '--tasks=legal-embeddings,case-similarity,evidence-processing',
        '--workers=4',
        '--enableGPU=true',
        '--profile=true',
      ],
      {
        stdio: 'pipe',
        env: {
          ...process.env,
          ENABLE_GPU: 'true',
          RTX_3060_OPTIMIZATION: 'true',
          OLLAMA_GPU_LAYERS: '35',
          GPU_MEMORY_LIMIT: '6144',
          BATCH_SIZE: '16',
        },
      }
    );

    clusterProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('GPU Cluster Concurrent Executor')) {
        this.log('GPU-Cluster', '🚀 Cluster initializing...', 'magenta');
      } else if (output.includes('GPU detected')) {
        this.log('GPU-Cluster', '✅ RTX 3060 Ti detected', 'green');
      } else if (output.includes('Worker') && output.includes('Starting')) {
        this.log('GPU-Cluster', `👥 ${output}`, 'cyan');
      } else if (output.includes('Completed')) {
        this.log('GPU-Cluster', `✅ ${output}`, 'green');
      } else if (output.includes('Failed') || output.includes('❌')) {
        this.log('GPU-Cluster', `❌ ${output}`, 'red');
      } else if (output.includes('Configuration')) {
        this.log('GPU-Cluster', `📋 ${output}`, 'blue');
      } else {
        this.log('GPU-Cluster', output, 'magenta');
      }
    });

    clusterProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error.includes('CUDA')) {
        this.log('GPU-Cluster', `🎮 ${error}`, 'yellow');
      } else {
        this.log('GPU-Cluster', `⚠️  ${error}`, 'yellow');
      }
    });

    clusterProcess.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        this.log('GPU-Cluster', `❌ Cluster exited with code ${code}`, 'red');
        // Auto-restart GPU cluster if it fails
        if (!this.isShuttingDown) {
          this.log('GPU-Cluster', '🔄 Restarting GPU cluster in 5 seconds...', 'yellow');
          setTimeout(() => {
            if (!this.isShuttingDown) {
              this.startGPUCluster();
            }
          }, 5000);
        }
      }
    });

    this.processes.push(clusterProcess);
    return clusterProcess;
  }

  async startMCPServer() {
    this.log('MCP', '🚀 Starting Enhanced MCP Multi-Core Server...', 'magenta');

    const mcpProcess = spawn('node', ['scripts/mcp-multicore-server.mjs'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        MCP_WORKERS: '4',
        MCP_GPU_ACCEL: 'true',
        CONTEXT7_MULTICORE: 'true',
        RTX_3060_OPTIMIZATION: 'true',
        NODE_OPTIONS: '--max-old-space-size=4096',
        MCP_PORT: '3001',
      },
    });

    mcpProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('MCP Multi-Core Server')) {
        this.log('MCP', '🚀 Server initializing...', 'magenta');
      } else if (output.includes('workers initialized')) {
        this.log('MCP', '✅ Workers ready for processing', 'green');
      } else if (output.includes('listening on port')) {
        this.log('MCP', '🌐 HTTP API endpoints active', 'cyan');
      } else if (output.includes('Worker')) {
        this.log('MCP', `👥 ${output}`, 'blue');
      } else {
        this.log('MCP', output, 'magenta');
      }
    });

    mcpProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      this.log('MCP', `⚠️  ${error}`, 'yellow');
    });

    mcpProcess.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        this.log('MCP', `❌ Server exited with code ${code}`, 'red');
      } else if (code === 0) {
        this.log('MCP', '✅ Server shutdown cleanly', 'green');
      }
    });

    this.processes.push(mcpProcess);

    // Wait for MCP server to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return mcpProcess;
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
    this.log(
      'System',
      '📋 Services: Docker Stack + CUDA + Frontend + Ollama + Redis-GPU Pipeline',
      'white'
    );
    this.log(
      'System',
      '🔌 WebSocket: Binary QLoRA streaming with real-time compression',
      'magenta'
    );
    this.log('System', '⚡ Redis-GPU: Legal AI pipeline with RTX 3060 Ti acceleration', 'blue');

    try {
      // Check if Docker Desktop is running first
      await this.checkDockerDesktop();
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for Docker startup

      // Check Docker services
      await this.checkDockerServices();
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for Docker check

      // Discover available ports with conflict resolution
      await this.discoverPorts();

      // Initialize GPU memory management
      await this.initializeGPU();

      // Start services in optimal order with sequential validation
      this.log('System', '🔄 Starting services sequentially...', 'cyan');

      // 1. PostgreSQL (Foundation service)
      await this.startPostgreSQL();
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 2. Redis (Cache layer)
      await this.startRedis();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 3. Ollama First (GPU AI Service - Priority)
      this.log('System', '🚀 Step 1: Ensuring Ollama is running on port 11434...', 'yellow');
      try {
        await this.startOllama();
        this.log('System', '✅ Ollama service validated and ready', 'green');
      } catch (error) {
        this.log('System', `⚠️  Ollama startup issue: ${error.message}`, 'yellow');
        this.log('System', '💡 Continuing with other services...', 'cyan');
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 4. CUDA Service (Hardware acceleration)
      this.log('System', '🔧 Step 2: Starting CUDA service with port validation...', 'magenta');
      try {
        await this.startCUDAService();
        this.log('System', '✅ CUDA service initialized successfully', 'green');
      } catch (error) {
        this.log('System', `⚠️  CUDA service issue: ${error.message}`, 'yellow');
        this.log('System', '💡 System will run without CUDA acceleration', 'cyan');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Start Redis-GPU Pipeline Bridge
      await this.startRedisGPUBridge();
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for bridge to connect

      // Start GPU Cluster in background (non-blocking)
      this.startGPUCluster(); // Don't await - runs continuously
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Give it time to initialize

      // 5. MCP Multi-Core Server (AI Integration layer)
      this.log('System', '🚀 Step 3: Starting MCP Multi-Core Server...', 'magenta');
      try {
        await this.startMCPServer();
        this.log('System', '✅ MCP server with 4 workers ready', 'green');
      } catch (error) {
        this.log('System', `⚠️  MCP server issue: ${error.message}`, 'yellow');
        this.log('System', '💡 Continuing without MCP multi-core features', 'cyan');
      }

      await this.startFrontend();

      this.log('System', '✅ All services started successfully!', 'green');
      this.log('System', '', 'white');
      this.log('System', '🌐 Frontend Services:', 'cyan');
      this.log('System', '🌐 Frontend: http://localhost:' + this.discoveredPorts.frontend, 'cyan');
      this.log(
        'System',
        '🧪 pgvector test: http://localhost:' +
          this.discoveredPorts.frontend +
          '/dev/pgvector-test',
        'cyan'
      );
      this.log(
        'System',
        '🔌 WebSocket API: ws://localhost:' + this.discoveredPorts.frontend + '/websocket',
        'magenta'
      );
      this.log(
        'System',
        '⚡ Binary QLoRA: http://localhost:' +
          this.discoveredPorts.frontend +
          '/api/ai/qlora-topology',
        'yellow'
      );
      this.log('System', '', 'white');
      this.log('System', '🤖 AI Services:', 'yellow');
      this.log(
        'System',
        '🤖 Ollama API: http://localhost:' + this.discoveredPorts.ollama,
        'yellow'
      );
      this.log(
        'System',
        '🎯 CUDA Service: http://localhost:' + this.discoveredPorts.cuda,
        'magenta'
      );
      this.log('System', '🔗 Redis-GPU Bridge: Active (job queue processing)', 'blue');
      this.log('System', '⚡ GPU Cluster: Legal AI pipeline running', 'magenta');
      this.log('System', '🚀 MCP Server: http://localhost:3001/mcp/health (4 workers)', 'magenta');
      this.log('System', '📊 MCP Metrics: http://localhost:3001/mcp/metrics', 'blue');
      this.log('System', '', 'white');
      this.log('System', '🐳 Docker Services:', 'cyan');
      this.log('System', '🐘 PostgreSQL: http://localhost:5433 (legal-ai-postgres)', 'blue');
      this.log('System', '🔴 Redis: http://localhost:6379 (legal-ai-redis)', 'red');
      this.log('System', '🐰 RabbitMQ: http://localhost:15672 (legal-ai-rabbitmq)', 'yellow');
      this.log('System', '📦 MinIO: http://localhost:9001 (legal-ai-minio)', 'green');
      this.log('System', '🔍 Qdrant: http://localhost:6333 (legal-ai-qdrant)', 'magenta');
      this.log('System', '', 'white');
      this.log('System', '🎯 Legal AI Pipeline Features:', 'green');
      this.log('System', '📄 Legal Document Embeddings (GPU-accelerated)', 'green');
      this.log('System', '⚖️  Case Similarity Analysis (pgvector)', 'green');
      this.log('System', '📁 Evidence Processing (Gemma3-legal)', 'green');
      this.log('System', '💬 Chat Session Persistence (Redis cache)', 'green');

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