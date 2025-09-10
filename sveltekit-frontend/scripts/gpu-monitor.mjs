#!/usr/bin/env node
/**
 * RTX 3060 Ti GPU Monitoring Script for Legal AI Development
 * Real-time GPU utilization, memory usage, and AI workload monitoring
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function clearScreen() {
    console.clear();
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function createProgressBar(percentage, width = 20) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    let color = 'green';
    if (percentage > 80) color = 'red';
    else if (percentage > 60) color = 'yellow';

    return `${colors[color]}${bar}${colors.reset} ${percentage.toString().padStart(3)}%`;
}

async function getNvidiaStats() {
    return new Promise((resolve) => {
        const cmd = spawn('nvidia-smi', [
            '--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,power.limit',
            '--format=csv,noheader,nounits'
        ]);

        let output = '';
        cmd.stdout.on('data', (data) => {
            output += data.toString();
        });

        cmd.on('close', (code) => {
            if (code === 0 && output.trim()) {
                const [name, util, memUsed, memTotal, temp, power, powerLimit] = output.trim().split(', ');
                resolve({
                    success: true,
                    name: name.trim(),
                    utilization: parseInt(util) || 0,
                    memoryUsed: parseInt(memUsed) || 0,
                    memoryTotal: parseInt(memTotal) || 0,
                    temperature: parseInt(temp) || 0,
                    power: parseFloat(power) || 0,
                    powerLimit: parseFloat(powerLimit) || 0
                });
            } else {
                resolve({ success: false, error: 'nvidia-smi not available' });
            }
        });

        cmd.on('error', () => {
            resolve({ success: false, error: 'NVIDIA drivers not installed' });
        });
    });
}

async function checkAiServices() {
    const services = [
        { name: 'Ollama', url: 'http://localhost:11435/api/version' },
        { name: 'Frontend', url: 'http://localhost:5173/api/health' },
        { name: 'Enhanced RAG', url: 'http://localhost:8081/health' }
    ];

    const results = await Promise.allSettled(
        services.map(async service => {
            try {
                const response = await fetch(service.url, {
                    signal: AbortSignal.timeout(2000)
                });
                return { name: service.name, status: response.ok };
            } catch {
                return { name: service.name, status: false };
            }
        })
    );

    return results.map(result => result.status === 'fulfilled' ? result.value : { name: 'Unknown', status: false });
}

async function displayDashboard() {
    const stats = await getNvidiaStats();
    const services = await checkAiServices();
    const timestamp = new Date().toLocaleTimeString();

    clearScreen();

    log('🎮 RTX 3060 Ti GPU Monitor - Legal AI Development Dashboard', 'cyan');
    log('━'.repeat(70), 'dim');

    if (stats.success) {
        const memoryPercent = Math.round((stats.memoryUsed / stats.memoryTotal) * 100);
        const powerPercent = Math.round((stats.power / stats.powerLimit) * 100);

        log(`📊 GPU: ${stats.name}`, 'bold');
        log(`┌─ GPU Utilization: ${createProgressBar(stats.utilization)}`);
        log(`├─ Memory Usage:   ${createProgressBar(memoryPercent)} (${formatBytes(stats.memoryUsed * 1024 * 1024)}/${formatBytes(stats.memoryTotal * 1024 * 1024)})`);
        log(`├─ Temperature:    ${stats.temperature}°C ${stats.temperature > 80 ? colors.red + '🔥' + colors.reset : stats.temperature > 70 ? colors.yellow + '⚠️' + colors.reset : colors.green + '✅' + colors.reset}`);
        log(`└─ Power Usage:    ${createProgressBar(powerPercent)} (${stats.power}W/${stats.powerLimit}W)`);

        // Performance recommendations
        console.log('');
        log('🔧 Performance Status:', 'magenta');
        if (stats.utilization < 20) {
            log('├─ 💤 GPU underutilized - Run AI workloads for better performance', 'yellow');
        } else if (stats.utilization > 90) {
            log('├─ 🔥 GPU at maximum capacity - Consider workload optimization', 'red');
        } else {
            log('├─ ⚡ GPU utilization optimal for AI/ML workloads', 'green');
        }

        if (memoryPercent > 90) {
            log('├─ 🚨 GPU memory nearly full - Reduce batch sizes', 'red');
        } else if (memoryPercent > 70) {
            log('├─ ⚠️  GPU memory high - Monitor for OOM errors', 'yellow');
        } else {
            log('├─ 💾 GPU memory usage healthy', 'green');
        }

        if (stats.temperature > 85) {
            log('└─ 🌡️  High temperature - Check cooling and reduce workloads', 'red');
        } else if (stats.temperature > 75) {
            log('└─ 🌡️  Temperature elevated - Monitor thermal throttling', 'yellow');
        } else {
            log('└─ 🌡️  Temperature normal - Optimal for sustained workloads', 'green');
        }
    } else {
        log('❌ GPU monitoring unavailable:', 'red');
        log(`   ${stats.error}`, 'red');
        log('   Install NVIDIA drivers and ensure nvidia-smi is in PATH', 'yellow');
    }

    console.log('');
    log('🤖 AI Services Status:', 'cyan');
    log('┌─ Service Health:', 'dim');
    services.forEach((service, index) => {
        const isLast = index === services.length - 1;
        const prefix = isLast ? '└─' : '├─';
        const status = service.status ? `${colors.green}✅ Online${colors.reset}` : `${colors.red}❌ Offline${colors.reset}`;
        log(`${prefix} ${service.name.padEnd(12)} ${status}`);
    });

    console.log('');
    log('📈 Environment:', 'blue');
    log(`┌─ CUDA_VISIBLE_DEVICES: ${process.env.CUDA_VISIBLE_DEVICES || 'Not set'}`);
    log(`├─ RTX_3060_OPTIMIZATION: ${process.env.RTX_3060_OPTIMIZATION || 'Not set'}`);
    log(`├─ ENABLE_GPU: ${process.env.ENABLE_GPU || 'Not set'}`);
    log(`└─ OLLAMA_GPU_LAYERS: ${process.env.OLLAMA_GPU_LAYERS || 'Not set'}`);

    console.log('');
    log(`🕐 Last updated: ${timestamp} | Press Ctrl+C to exit`, 'dim');

    // Environment recommendations
    if (!process.env.CUDA_VISIBLE_DEVICES) {
        log('💡 Tip: Set CUDA_VISIBLE_DEVICES=0 for single GPU optimization', 'yellow');
    }
    if (!process.env.RTX_3060_OPTIMIZATION) {
        log('💡 Tip: Set RTX_3060_OPTIMIZATION=true for RTX-specific optimizations', 'yellow');
    }
}

async function monitorLoop() {
    log('🚀 Starting RTX 3060 Ti GPU Monitor...', 'cyan');
    log('   Monitoring GPU utilization, memory, and AI services', 'dim');
    console.log('');

    while (true) {
        await displayDashboard();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Update every 3 seconds
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('');
    log('👋 GPU monitoring stopped. Goodbye!', 'cyan');
    process.exit(0);
});

process.on('SIGTERM', () => {
    process.exit(0);
});

// Start monitoring
monitorLoop().catch(error => {
    log(`❌ Monitor failed: ${error.message}`, 'red');
    process.exit(1);
});
