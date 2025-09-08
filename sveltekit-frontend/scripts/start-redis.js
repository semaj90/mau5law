#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// Try to find redis-server in common locations
const commonPaths = [
  '../redis-latest/redis-server.exe', // Your Redis location
  'redis-server', // In PATH
  '/usr/bin/redis-server', // Linux/WSL
  '/usr/local/bin/redis-server', // macOS Homebrew
  'C:\\Program Files\\Redis\\redis-server.exe', // Windows typical install
  'C:\\Tools\\redis\\redis-server.exe', // Chocolatey location
  process.env.REDIS_SERVER_PATH, // User-defined
].filter(Boolean);

function findRedisServer() {
  for (const redisPath of commonPaths) {
    try {
      if (existsSync(redisPath)) {
        return redisPath;
      }
    } catch (e) {
      // Continue searching
    }
  }
  return 'redis-server'; // Fallback to PATH
}

async function checkDockerRedis() {
  try {
    const { spawn } = await import('child_process');
    return new Promise((resolve) => {
      const docker = spawn('docker', ['ps', '--filter', 'name=legal-ai-redis', '--format', '{{.Names}}'], {
        stdio: 'pipe'
      });
      
      let output = '';
      docker.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      docker.on('close', (code) => {
        resolve(output.includes('legal-ai-redis'));
      });
      
      docker.on('error', () => {
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

async function startRedis() {
  // Check if Docker Redis is already running
  const dockerRedisRunning = await checkDockerRedis();
  
  if (dockerRedisRunning) {
    console.log('✅ Docker Redis detected (legal-ai-redis)');
    console.log('📍 Using Docker Redis on port 6379');
    console.log('🔗 Skipping local Redis startup');
    return;
  }
  
  const redisPath = findRedisServer();
  
  console.log('🚀 Starting Local Redis Server...');
  console.log(`📍 Using: ${redisPath}`);
  
  const redis = spawn(redisPath, [
    '--port', '6379', // Use standard Redis port
    '--bind', '127.0.0.1',
    '--save', '60', '1000', // Save every 60s if at least 1000 keys changed
    '--loglevel', 'notice'
  ], {
    stdio: 'inherit'
  });

  redis.on('error', (err) => {
    console.error('❌ Failed to start Redis:', err.message);
    console.log('💡 Try installing Redis:');
    console.log('   Windows: choco install redis-64');
    console.log('   macOS: brew install redis');
    console.log('   Linux: sudo apt install redis-server');
    process.exit(1);
  });

  redis.on('close', (code) => {
    console.log(`🔴 Redis server exited with code ${code}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Redis server...');
    redis.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Redis server...');
    redis.kill('SIGTERM');
    process.exit(0);
  });
}

startRedis().catch(console.error);