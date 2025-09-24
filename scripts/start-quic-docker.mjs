#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting Legal AI Docker + SvelteKit Development Stack...');
console.log('⚡ Using Docker Desktop services + QUIC-ready frontend');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Track child processes for cleanup
const childProcesses = new Set();

// Graceful shutdown handler
function gracefulShutdown(signal) {
    console.log(`\n📡 Received ${signal}. Shutting down development stack...`);

    // Stop all child processes
    childProcesses.forEach(child => {
        if (!child.killed) {
            console.log(`  ⏹ Stopping process ${child.pid}...`);
            child.kill('SIGTERM');
        }
    });

    console.log('✅ Development stack stopped');
    process.exit(0);
}

// Register signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

async function startDockerDev() {
    try {
        console.log('🐳 Checking Docker services...');

        const dockerCheck = spawn('docker', ['ps', '--filter', 'name=legal-ai', '--format', 'table {{.Names}}\t{{.Status}}'], {
            stdio: 'pipe'
        });

        dockerCheck.stdout.on('data', (data) => {
            console.log(`🐳 Docker: ${data.toString().trim()}`);
        });

        // Wait for Docker check
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('🧠 Starting MCP Context7 Server...');

        const mcpServer = spawn('node', ['scripts/mcp-multicore-server.mjs'], {
            cwd: projectRoot,
            stdio: 'pipe',
            env: {
                ...process.env,
                MCP_PORT: '3002',
                NODE_ENV: 'development'
            }
        });

        childProcesses.add(mcpServer);

        // Log MCP server output
        mcpServer.stdout.on('data', (data) => {
            const message = data.toString().trim();
            console.log(`🧠 MCP: ${message}`);
        });

        mcpServer.stderr.on('data', (data) => {
            console.log(`🧠 MCP Error: ${data.toString().trim()}`);
        });

        // Wait for MCP server to initialize
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('🔷 Starting SvelteKit Development Server with full Docker integration...');

        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const svelteKit = spawn(npmCmd, ['run', 'dev', '--', '--port', '5173', '--host', '127.0.0.1'], {
            cwd: join(projectRoot, 'sveltekit-frontend'),
            stdio: 'pipe',
            shell: true,
            env: {
                ...process.env,
                // Redis configuration (Docker)
                REDIS_PASSWORD: 'redis',
                REDIS_HOST: 'localhost',
                REDIS_PORT: '6379',
                // MinIO configuration (Docker)
                MINIO_ENDPOINT: 'localhost:9000',
                MINIO_ACCESS_KEY: 'minio',
                MINIO_SECRET_KEY: 'minio123',
                MINIO_BUCKET_NAME: 'legal-documents',
                MINIO_USE_SSL: 'false',
                // PostgreSQL configuration (Docker)
                DATABASE_URL: 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db',
                // Development settings
                NODE_ENV: 'development',
                VITE_NODE_ENV: 'development'
            }
        });

        childProcesses.add(svelteKit);

        // Log SvelteKit output
        svelteKit.stdout.on('data', (data) => {
            const message = data.toString().trim();
            console.log(`🔷 SvelteKit: ${message}`);
        });

        svelteKit.stderr.on('data', (data) => {
            const message = data.toString().trim();
            console.log(`🔷 SvelteKit: ${message}`);
        });

        // Wait for SvelteKit to initialize
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Show status and access points
        console.log('\n🎉 Legal AI Docker + SvelteKit Development Stack is running!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 Access Points:');
        console.log('   🔷 SvelteKit Frontend:        http://localhost:5173');
        console.log('   🧠 MCP Context7 API:          http://localhost:3002');
        console.log('   🗄️ MinIO Console:             http://localhost:9001 (minio/minio123)');
        console.log('   🗄️ MinIO API:                 http://localhost:9000');
        console.log('   🔴 Redis Insight:             http://localhost:8001');
        console.log('   🐘 PostgreSQL:                localhost:5432 (legal_admin/123456)');
        console.log('   🐰 RabbitMQ Management:       http://localhost:15672 (legal_admin/123456)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🐳 Docker Services:');
        console.log('   • PostgreSQL with pgvector for embeddings');
        console.log('   • Redis Stack with modules (JSON, Search, Bloom)');
        console.log('   • MinIO for document storage');
        console.log('   • RabbitMQ for message queuing');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💡 Ready for development with hot reload');
        console.log('💡 Press Ctrl+C to stop all services');
        console.log('');

        // Monitor services
        monitorServices();

    } catch (error) {
        console.error('❌ Failed to start development stack:', error.message);
        process.exit(1);
    }
}

function monitorServices() {
    console.log('📊 Monitoring development services...\n');

    // Health check endpoints periodically
    const healthInterval = setInterval(() => {
        console.log('🏥 Quick health check...');

        // Check Docker services
        const healthChecks = [
            'http://localhost:5173',         // SvelteKit
            'http://localhost:3002',         // MCP server
            'http://localhost:9000',         // MinIO
            'http://localhost:6379'          // Redis (basic check)
        ];

        healthChecks.forEach(url => {
            const curlCheck = spawn('curl', ['-f', '-s', url], {
                stdio: 'pipe'
            });

            curlCheck.on('close', (code) => {
                const status = code === 0 ? '✅' : '❌';
                console.log(`  ${status} ${url}`);
            });
        });

        console.log('');
    }, 30000); // Every 30 seconds

    // Keep the process alive
    const keepAlive = setInterval(() => {
        // This keeps the process running
    }, 1000);

    // Clean up intervals on shutdown
    process.on('exit', () => {
        clearInterval(healthInterval);
        clearInterval(keepAlive);
    });
}

// Start the development stack
startDockerDev().catch(error => {
    console.error('❌ Error starting development stack:', error);
    process.exit(1);
});