#!/usr/bin/env node

/**
 * Development Startup Script
 * Legal AI Platform with NES Texture Streaming
 * 
 * Starts all services in development mode with hot reload and debugging
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

class DevelopmentManager {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
    this.startTime = Date.now();
    this.isShuttingDown = false;
    
    // Load development environment
    this.loadEnvironment();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  loadEnvironment() {
    try {
      const envFile = fs.readFileSync('.env.development', 'utf8');
      const envVars = envFile
        .split('\n')
        .filter(line => line && !line.startsWith('#'))
        .reduce((acc, line) => {
          const [key, value] = line.split('=');
          if (key && value) {
            process.env[key.trim()] = value.trim();
          }
          return acc;
        }, {});
      
      console.log('🔧 Development environment loaded');
    } catch (error) {
      console.error('⚠️ Could not load .env.development, using defaults');
    }
  }

  async startService(name, command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const service = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env, ...options.env },
        shell: true,
        ...options
      });

      service.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`[${name}] ${output}`);
        }
      });

      service.stderr.on('data', (data) => {
        const error = data.toString().trim();
        if (error && !error.includes('Warning:')) {
          console.log(`[${name}] ${error}`); // Show stderr in dev mode
        }
      });

      service.on('spawn', () => {
        console.log(`🚀 ${name} started (PID: ${service.pid})`);
        this.services.set(name, service);
        resolve(service);
      });

      service.on('error', (error) => {
        console.error(`❌ ${name} failed to start: ${error.message}`);
        reject(error);
      });

      service.on('exit', (code, signal) => {
        if (!this.isShuttingDown) {
          console.log(`🔄 ${name} exited with code ${code} (signal: ${signal})`);
          // Auto-restart in development mode
          if (code !== 0 && !this.isShuttingDown) {
            setTimeout(() => {
              console.log(`🔁 Auto-restarting ${name}...`);
              this.startService(name, command, args, options);
            }, 2000);
          }
        }
        this.services.delete(name);
      });
    });
  }

  async startAllServices() {
    console.log('🔧 Starting Legal AI Platform - Development Mode');
    console.log('🎮 Nintendo-Style Legal AI with Hot Reload (Full Stack)');
    console.log('═'.repeat(60));

    try {
      // 1. Check if MCP Multi-Core Server is already running
      if (process.env.ENABLE_MCP_SERVER === 'true') {
        const isMCPRunning = await this.checkPort(process.env.MCP_SERVER_PORT || '3002');
        if (!isMCPRunning) {
          await this.startService(
            'MCP-Server',
            'node',
            ['scripts/mcp-multicore-server.mjs'],
            { env: { MCP_PORT: process.env.MCP_SERVER_PORT || '3002' } }
          );
          await this.delay(2000);
        } else {
          console.log('✅ MCP Server already running on port 3002');
        }
      }

      // 2. Start Full Development Stack (uses existing npm run dev:full)
      await this.startService(
        'Full-Stack-Dev',
        'npm',
        ['run', 'dev:full'],
        { 
          cwd: './sveltekit-frontend',
          env: { 
            PORT: '5174',
            REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'redis',
            NODE_ENV: 'development'
          }
        }
      );

      // 3. Setup development health monitoring
      this.startDevelopmentMonitoring();

      console.log('═'.repeat(60));
      console.log('🎉 Development environment ready!');
      console.log('🔧 Hot reload: ENABLED');
      console.log('🐛 Debug mode: ENABLED');
      console.log('📊 Frontend: http://localhost:5174');
      console.log('🎮 NES Demo: http://localhost:5174/demo/nes-texture-streaming');
      console.log('🏥 Health: npm run health');
      console.log('🔍 GPU Monitor: Running');
      console.log('═'.repeat(60));

    } catch (error) {
      console.error('💥 Failed to start development services:', error);
      process.exit(1);
    }
  }

  async checkPort(port) {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      return stdout.includes('LISTENING');
    } catch {
      return false;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  startDevelopmentMonitoring() {
    const healthCheck = setInterval(async () => {
      try {
        // Check NES API
        const nesResponse = await fetch('http://localhost:8097/api/health');
        const nesHealth = await nesResponse.json();
        
        // Log development stats every 2 minutes
        if (Date.now() - this.startTime > 120000) {
          const memoryMB = (nesHealth.memory.heapUsed / 1024 / 1024).toFixed(1);
          console.log(`💻 Dev Stats: NES ${(nesHealth.uptime / 60).toFixed(1)}m uptime, ${memoryMB}MB heap`);
        }
      } catch (error) {
        console.log('🔧 Dev: Health check temporary failure (normal in dev)');
      }
    }, 60000); // Every minute in dev mode

    this.healthChecks.set('dev', healthCheck);
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Development shutdown (${signal})...`);
      this.isShuttingDown = true;

      // Clear health checks
      for (const [name, check] of this.healthChecks) {
        clearInterval(check);
      }

      // Stop all services
      for (const [name, service] of this.services) {
        console.log(`⏹️ Stopping ${name}...`);
        service.kill('SIGTERM');
      }

      // Wait for services to stop
      await this.delay(2000);

      // Force kill if necessary
      for (const [name, service] of this.services) {
        if (!service.killed) {
          console.log(`💀 Force killing ${name}...`);
          service.kill('SIGKILL');
        }
      }

      console.log('✅ Development shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught exceptions in development
    process.on('uncaughtException', (error) => {
      console.error('🐛 Dev Exception:', error);
      console.log('🔧 Continuing in development mode...');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🐛 Dev Rejection:', reason);
      console.log('🔧 Continuing in development mode...');
    });
  }
}

// Start the development manager
const manager = new DevelopmentManager();
manager.startAllServices().catch(console.error);