#!/usr/bin/env node

/**
 * Enhanced dev:full script with GPU memory awareness
 * Optimized for RTX 3060 Ti and Legal AI workloads
 */

import { spawn } from 'child_process';
import GPUMemoryManager from './init-gpu-memory.js';
import chalk from 'chalk';

class DevFullManager {
  constructor() {
    this.processes = [];
    this.gpuManager = new GPUMemoryManager();
    this.isShuttingDown = false;
  }

  log(service, message, color = 'white') {
    const timestamp = new Date().toLocaleTimeString();
    const serviceTag = `[${service}]`.padEnd(12);
    console.log(chalk[color](`${timestamp} ${serviceTag} ${message}`));
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
    this.log('PostgreSQL', '🐘 Checking PostgreSQL status...', 'blue');
    
    try {
      // Check if PostgreSQL is already running
      const testProcess = spawn('pg_isready', ['-h', 'localhost', '-p', '5432'], {
        stdio: 'pipe'
      });
      
      testProcess.on('close', (code) => {
        if (code === 0) {
          this.log('PostgreSQL', '✅ PostgreSQL is running', 'green');
        } else {
          this.log('PostgreSQL', '⚠️  PostgreSQL not responding, attempting to start...', 'yellow');
          // Attempt to start PostgreSQL service
          const startCmd = process.platform === 'win32' ? 
            'net start postgresql-x64-17' : 
            'sudo systemctl start postgresql';
          
          spawn(startCmd, [], { shell: true, stdio: 'inherit' });
        }
      });
    } catch (error) {
      this.log('PostgreSQL', `❌ Error checking PostgreSQL: ${error.message}`, 'red');
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
    this.log('Frontend', '🖥️  Starting SvelteKit frontend...', 'cyan');
    
    const frontendProcess = spawn('npx', ['vite', 'dev', '--port', '5173', '--host'], {
      stdio: 'pipe',
      env: { ...process.env }
    });
    
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('ready in')) {
        this.log('Frontend', `✅ ${output}`, 'green');
      } else if (output.includes('Local:')) {
        this.log('Frontend', `🌐 ${output}`, 'cyan');
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
    
    const ollamaProcess = spawn('ollama', ['serve'], {
      stdio: 'pipe',
      env: { ...process.env }
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
    this.log('System', '📋 Services: PostgreSQL + CUDA + Frontend + Ollama + Redis', 'white');
    
    try {
      // Initialize GPU memory management
      await this.initializeGPU();
      
      // Start services in optimal order
      await this.startPostgreSQL();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for PostgreSQL
      
      await this.startRedis();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Redis
      
      await this.startCUDAService();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for CUDA
      
      await this.startOllama();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Ollama
      
      await this.startFrontend();
      
      this.log('System', '✅ All services started successfully!', 'green');
      this.log('System', '🌐 Frontend available at: http://localhost:5173', 'cyan');
      this.log('System', '🧪 pgvector test: http://localhost:5173/dev/pgvector-test', 'cyan');
      this.log('System', '🤖 Ollama API: http://localhost:11434', 'yellow');
      this.log('System', '🎯 CUDA Service: http://localhost:8080', 'magenta');
      
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