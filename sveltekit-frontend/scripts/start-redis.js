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

function startRedis() {
  const redisPath = findRedisServer();
  
  console.log('🚀 Starting Redis Server...');
  console.log(`📍 Using: ${redisPath}`);
  
  const redis = spawn(redisPath, [
    '--port', '4005',
    '--bind', '127.0.0.1',
    '--protected-mode', 'no',
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

startRedis();