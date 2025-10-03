#!/usr/bin/env node

import { spawn } from 'child_process';
import { findFreePort } from './find-free-port.js';
import chalk from 'chalk';

const PREFERRED_PORT = parseInt(process.env.PORT) || 5173;
const MAX_PORT_TRIES = 10;

async function startDevServer() {
  console.log(chalk.cyan('\n🔍 Checking for available port...\n'));

  try {
    const availablePort = await findFreePort(PREFERRED_PORT, MAX_PORT_TRIES);

    if (availablePort !== PREFERRED_PORT) {
      console.log(chalk.yellow(`⚠️  Port ${PREFERRED_PORT} is in use`));
      console.log(chalk.green(`✅ Using fallback port: ${availablePort}\n`));
    } else {
      console.log(chalk.green(`✅ Port ${PREFERRED_PORT} is available\n`));
    }

    // Start Redis checker first
    const redisProcess = spawn('node', ['scripts/start-redis.js'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    // Give Redis a moment to initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Start Vite with the available port
    const viteProcess = spawn(
      'vite',
      ['dev', '--host', '0.0.0.0', '--port', availablePort.toString(), '--strictPort', 'false'],
      {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1', VITE_PORT: availablePort.toString() },
      }
    );

    // Handle graceful shutdown
    const shutdown = (signal) => {
      console.log(chalk.yellow(`\n\n🛑 Received ${signal}, shutting down gracefully...\n`));

      redisProcess.kill('SIGTERM');
      viteProcess.kill('SIGTERM');

      setTimeout(() => {
        redisProcess.kill('SIGKILL');
        viteProcess.kill('SIGKILL');
        process.exit(0);
      }, 5000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Monitor process exits
    redisProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(chalk.red(`❌ Redis process exited with code ${code}`));
      }
    });

    viteProcess.on('exit', (code) => {
      console.log(chalk.yellow(`\n🛑 Vite server stopped (exit code: ${code})\n`));
      redisProcess.kill('SIGTERM');
      process.exit(code || 0);
    });

  } catch (error) {
    console.error(chalk.red(`\n❌ Failed to start dev server: ${error.message}\n`));
    process.exit(1);
  }
}

// Start the server
startDevServer().catch((err) => {
  console.error(chalk.red(`\n❌ Startup error: ${err.message}\n`));
  process.exit(1);
});
