#!/usr/bin/env zx

import { $, argv, chalk, sleep } from 'zx';

// GPU Cluster Concurrent Executor
// Orchestrates multiple GPU workers with concurrent execution
console.log(chalk.cyan('🚀 GPU Cluster Concurrent Executor v1.0'));

const config = {
  workers: argv.workers || 4,
  gpuContexts: argv['gpu-contexts'] || 1,
  tasks: argv.tasks?.split(',') || ['inference', 'training', 'vectorization'],
  profile: argv.profile || false,
  enableGPU: argv.enableGPU || process.env.ENABLE_GPU === 'true',
  enableMCP: argv.enableMCP || false,
  maxMemory: argv.maxMemory || '8192',
  timeout: argv.timeout || 300000
};

console.log(chalk.blue('📋 Configuration:'));
console.log(`   Workers: ${config.workers}`);
console.log(`   GPU Contexts: ${config.gpuContexts}`);
console.log(`   Tasks: ${config.tasks.join(', ')}`);
console.log(`   Profile Mode: ${config.profile}`);
console.log(`   GPU Enabled: ${config.enableGPU}`);
console.log(`   Max Memory: ${config.maxMemory}MB`);

// Check GPU availability
async function checkGPUAvailability() {
  try {
    if (config.enableGPU) {
      const result = await $`nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv,noheader,nounits`;
      console.log(chalk.green('✅ GPU detected:'));
      result.stdout.split('\n').filter(line => line.trim()).forEach((line, i) => {
        console.log(chalk.gray(`   GPU ${i}: ${line.trim()}`));
      });
    } else {
      console.log(chalk.yellow('⚠️  GPU acceleration disabled'));
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  GPU not available, running in CPU mode'));
    config.enableGPU = false;
  }
}

// Task definitions
const taskDefinitions = {
  'inference': {
    name: 'AI Inference',
    cmd: ['npm', 'run', 'check:typescript'],
    env: { OLLAMA_GPU_LAYERS: '30', RTX_3060_OPTIMIZATION: 'true' }
  },
  'training': {
    name: 'Model Training',
    cmd: ['npm', 'run', 'build:wasm'],
    env: { ENABLE_TRAINING: 'true' }
  },
  'vectorization': {
    name: 'Vector Operations',
    cmd: ['npm', 'run', 'build:wasm'],
    env: { ENABLE_WASM_GPU: 'true' }
  },
  'simd-parser': {
    name: 'SIMD Parser',
    cmd: ['npm', 'run', 'check:svelte'],
    env: { SIMD_ENABLED: 'true' }
  },
  'simd-indexer': {
    name: 'SIMD Indexer', 
    cmd: ['npm', 'run', 'rag:verify-embeddings'],
    env: { SIMD_INDEXING: 'true' }
  },
  'webgpu-som': {
    name: 'WebGPU SOM Cache',
    cmd: ['npm', 'run', 'check:ultra-fast'],
    env: { WEBGPU_ENABLED: 'true' }
  }
};

// Worker execution
async function executeWorker(workerId, task) {
  const taskDef = taskDefinitions[task];
  if (!taskDef) {
    console.log(chalk.red(`❌ Unknown task: ${task}`));
    return { success: false, error: `Unknown task: ${task}` };
  }

  const startTime = Date.now();
  console.log(chalk.blue(`🔧 Worker ${workerId}: Starting ${taskDef.name}`));

  try {
    // Set environment variables
    process.env.WORKER_ID = workerId;
    process.env.NODE_OPTIONS = `--max-old-space-size=${config.maxMemory}`;
    if (config.enableGPU) {
      process.env.CUDA_VISIBLE_DEVICES = (workerId % config.gpuContexts).toString();
    }
    
    // Apply task-specific environment variables
    Object.entries(taskDef.env).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Execute task - use spawn-like syntax for better control
    const [command, ...args] = taskDef.cmd;
    const result = await $`${command} ${args}`;
    
    const duration = Date.now() - startTime;
    console.log(chalk.green(`✅ Worker ${workerId}: Completed ${taskDef.name} in ${duration}ms`));
    
    return { 
      success: true, 
      duration,
      workerId,
      task: taskDef.name,
      output: result.stdout
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(chalk.red(`❌ Worker ${workerId}: Failed ${taskDef.name} after ${duration}ms`));
    console.log(chalk.gray(`   Error: ${error.message}`));
    
    return { 
      success: false, 
      duration,
      workerId,
      task: taskDef.name,
      error: error.message 
    };
  }
}

// Main execution
async function main() {
  console.log(chalk.cyan('\n🔍 Checking system requirements...'));
  await checkGPUAvailability();

  console.log(chalk.cyan('\n🚀 Starting concurrent execution...'));
  
  const workers = [];
  const results = [];
  
  // Create worker promises
  for (let i = 0; i < config.workers; i++) {
    const taskIndex = i % config.tasks.length;
    const task = config.tasks[taskIndex];
    
    const workerPromise = executeWorker(i + 1, task).then(result => {
      results.push(result);
      return result;
    });
    
    workers.push(workerPromise);
    
    // Stagger worker starts to avoid resource conflicts
    await sleep(500);
  }

  // Wait for all workers to complete
  console.log(chalk.cyan(`\n⏳ Waiting for ${workers.length} workers to complete...`));
  await Promise.allSettled(workers);

  // Report results
  console.log(chalk.cyan('\n📊 Execution Summary:'));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(chalk.green(`✅ Successful: ${successful.length}`));
  console.log(chalk.red(`❌ Failed: ${failed.length}`));
  
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    console.log(chalk.blue(`⏱️  Average duration: ${Math.round(avgDuration)}ms`));
  }

  // Profile report
  if (config.profile || argv.report) {
    console.log(chalk.cyan('\n📈 Performance Profile:'));
    
    results.forEach(result => {
      const status = result.success ? chalk.green('✅') : chalk.red('❌');
      console.log(`${status} Worker ${result.workerId}: ${result.task} - ${result.duration}ms`);
    });
    
    // GPU memory usage if available
    if (config.enableGPU) {
      try {
        const memUsage = await $`nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits`;
        console.log(chalk.blue('\n🎮 GPU Memory Usage:'));
        memUsage.stdout.split('\n').filter(line => line.trim()).forEach((line, i) => {
          const [used, total] = line.trim().split(', ');
          const percent = Math.round((used / total) * 100);
          console.log(chalk.gray(`   GPU ${i}: ${used}MB / ${total}MB (${percent}%)`));
        });
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not retrieve GPU memory usage'));
      }
    }
  }

  // Exit with appropriate code
  const exitCode = failed.length > 0 ? 1 : 0;
  console.log(chalk.cyan(`\n🎯 Execution complete. Exit code: ${exitCode}`));
  process.exit(exitCode);
}

// Error handling
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n⚠️  Received SIGINT, shutting down workers...'));
  process.exit(130);
});

process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Unhandled rejection:'), error);
  process.exit(1);
});

// Run main function
main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});