#!/usr/bin/env node

/**
 * Production Startup Script
 * Legal AI Platform with NES Texture Streaming
 * 
 * Starts all services in production mode with proper error handling
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

class ProductionManager {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
    this.startTime = Date.now();
    this.isShuttingDown = false;
    
    // Load production environment
    this.loadEnvironment();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  loadEnvironment() {
    try {
      const envFile = fs.readFileSync('.env.production', 'utf8');
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
      
      console.log('✅ Production environment loaded');
    } catch (error) {
      console.error('⚠️ Could not load .env.production, using defaults');
    }
  }

  async startService(name, command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const service = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env, ...options.env },
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
          console.error(`[${name}] ERROR: ${error}`);
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
          console.error(`💥 ${name} exited with code ${code} (signal: ${signal})`);
          // Auto-restart critical services
          if (code !== 0 && !this.isShuttingDown) {
            setTimeout(() => {
              console.log(`🔄 Restarting ${name}...`);
              this.startService(name, command, args, options);
            }, 5000);
          }
        }
        this.services.delete(name);
      });
    });
  }

  async startAllServices() {
    console.log('🎮 Starting Legal AI Platform - Production Mode');
    console.log('═'.repeat(60));

    try {
      // 1. Start MCP Multi-Core Server
      if (process.env.ENABLE_MCP_SERVER === 'true') {
        await this.startService(
          'MCP-Server',
          'node',
          ['scripts/mcp-multicore-server.mjs'],
          { env: { MCP_PORT: process.env.MCP_SERVER_PORT || '3002' } }
        );
        await this.delay(2000);
      }

      // 2. Start NES Pipeline (if not already running)
      if (process.env.ENABLE_NES_PIPELINE === 'true') {
        const isNESRunning = await this.checkPort(process.env.NES_PIPELINE_PORT || '8097');
        if (!isNESRunning) {
          await this.startService(
            'NES-Pipeline',
            'node',
            ['scripts/nes-pipeline-simple.mjs'],
            { env: { PORT: process.env.NES_PIPELINE_PORT || '8097' } }
          );
          await this.delay(2000);
        } else {
          console.log('✅ NES Pipeline already running on port 8097');
        }
      }

      // 3. Start Frontend
      await this.startService(
        'Frontend',
        'npm',
        ['run', 'dev'],
        { 
          cwd: './sveltekit-frontend',
          env: { 
            PORT: process.env.FRONTEND_PORT || '5173',
            REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'redis'
          }
        }
      );

      // 4. Setup health monitoring
      this.startHealthMonitoring();

      console.log('═'.repeat(60));
      console.log('🎉 All services started successfully!');
      console.log('📊 System Dashboard: http://localhost:5173');
      console.log('🎮 NES Demo: http://localhost:5173/demo/nes-texture-streaming');
      console.log('🏥 Health Check: http://localhost:8097/api/health');
      console.log('═'.repeat(60));

    } catch (error) {
      console.error('💥 Failed to start services:', error);
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

  startHealthMonitoring() {
    const healthCheck = setInterval(async () => {
      try {
        // Check NES API
        const nesResponse = await fetch('http://localhost:8097/api/health');
        const nesHealth = await nesResponse.json();
        
        // Log health status every 5 minutes
        if (Date.now() - this.startTime > 300000) {
          console.log(`💓 Health: NES uptime ${(nesHealth.uptime / 60).toFixed(1)}m`);
        }
      } catch (error) {
        console.warn('⚠️ Health check failed:', error.message);
      }
    }, 30000); // Every 30 seconds

    this.healthChecks.set('main', healthCheck);
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
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
      await this.delay(3000);

      // Force kill if necessary
      for (const [name, service] of this.services) {
        if (!service.killed) {
          console.log(`💀 Force killing ${name}...`);
          service.kill('SIGKILL');
        }
      }

      console.log('✅ Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }
}

// Start the production manager
const manager = new ProductionManager();
manager.startAllServices().catch(console.error);