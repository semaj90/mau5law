#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting QUIC Stack (Vite+Caddy in Docker Desktop)...\n');

// Track child processes for cleanup
const childProcesses = new Set();

// Graceful shutdown handler
function gracefulShutdown(signal) {
    console.log(`\n📡 Received ${signal}. Gracefully shutting down QUIC stack...`);

    // Stop all child processes
    childProcesses.forEach(child => {
        if (!child.killed) {
            console.log(`  ⏹ Stopping process ${child.pid}...`);
            child.kill('SIGTERM');
        }
    });

    // Stop only Vite+Caddy containers
    console.log('  🐳 Stopping Vite+Caddy containers...');
    const dockerStop = spawn('docker-compose', ['-f', 'docker-compose.dynamic.yml', 'stop', 'frontend', 'caddy'], {
        cwd: projectRoot,
        stdio: 'inherit'
    });

    dockerStop.on('close', () => {
        console.log('✅ QUIC stack stopped successfully');
        process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        console.log('⚠️  Force exiting...');
        process.exit(1);
    }, 10000);
}

// Register signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

async function startQuicStack() {
    try {
        // Step 1: Create network if it doesn't exist
        console.log('📡 Creating Docker network...');
        const createNetwork = spawn('docker', ['network', 'create', 'legal-ai-network'], {
            cwd: projectRoot,
            stdio: 'pipe'
        });

        await new Promise(resolve => {
            createNetwork.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Docker network created');
                } else {
                    console.log('ℹ️  Docker network already exists');
                }
                resolve();
            });
        });

        // Step 2: Start only Vite+Caddy containers
        console.log('🐳 Starting Vite+Caddy containers...');
        const dockerUp = spawn('docker-compose', ['-f', 'docker-compose.dynamic.yml', 'up', '-d', 'frontend', 'caddy'], {
            cwd: projectRoot,
            stdio: 'inherit'
        });

        childProcesses.add(dockerUp);

        await new Promise((resolve, reject) => {
            dockerUp.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Docker containers started');
                    resolve();
                } else {
                    reject(new Error(`Docker failed with exit code ${code}`));
                }
            });
        });

        // Step 3: Wait a moment for services to initialize
        console.log('⏳ Waiting for services to initialize...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Step 4: Show status and access points
        console.log('\n🎉 Vite+Caddy QUIC Stack is running!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 Access Points:');
        console.log('   🌐 Frontend (via Caddy QUIC): https://localhost');
        console.log('   🌐 Frontend (HTTP):           http://localhost');
        console.log('   🌐 Frontend (direct Vite):    http://localhost:5173');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💡 Database/Redis should be running separately in Docker Desktop');
        console.log('💡 Press Ctrl+C to stop Vite+Caddy services gracefully');
        console.log('');

        // Step 5: Monitor container health
        monitorContainers();

    } catch (error) {
        console.error('❌ Failed to start QUIC stack:', error.message);
        process.exit(1);
    }
}

function monitorContainers() {
    console.log('📊 Monitoring container status...\n');

    const showStatus = () => {
        const ps = spawn('docker-compose', ['-f', 'docker-compose.dynamic.yml', 'ps', '--format', 'table'], {
            cwd: projectRoot,
            stdio: 'inherit'
        });

        ps.on('close', () => {
            console.log('\n⚡ QUIC stack running. Press Ctrl+C to stop.\n');
        });
    };

    // Show initial status
    showStatus();

    // Show status every 30 seconds
    const statusInterval = setInterval(showStatus, 30000);

    // Keep the process alive
    const keepAlive = setInterval(() => {
        // This keeps the process running
    }, 1000);

    // Clean up intervals on shutdown
    process.on('exit', () => {
        clearInterval(statusInterval);
        clearInterval(keepAlive);
    });
}

// Start the stack
startQuicStack().catch(error => {
    console.error('❌ Error starting QUIC stack:', error);
    process.exit(1);
});