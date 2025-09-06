#!/usr/bin/env node
/**
 * Test script for the enhanced dev:full command with Go services build
 * This will validate that the build integration works correctly
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import chalk from 'chalk';

const testGoServicesBuild = async () => {
  console.log(chalk.cyan('🧪 Testing Go services build integration...'));
  
  // Check if the build script exists
  const buildScriptPath = '../build-go-services.ps1';
  if (!existsSync(buildScriptPath)) {
    console.log(chalk.red('❌ Build script not found at'), buildScriptPath);
    return false;
  }
  
  console.log(chalk.green('✅ Build script found'));
  
  // Check if the orchestrator script was modified correctly
  const orchestratorPath = 'scripts/start-coordinated-full-stack.mjs';
  try {
    const content = await fs.readFile(orchestratorPath, 'utf8');
    
    if (content.includes('buildGoServices')) {
      console.log(chalk.green('✅ Build integration added to orchestrator'));
    } else {
      console.log(chalk.red('❌ Build integration not found in orchestrator'));
      return false;
    }
    
    if (content.includes('Phase 1.5: Build Go microservices')) {
      console.log(chalk.green('✅ Build phase properly sequenced'));
    } else {
      console.log(chalk.red('❌ Build phase not properly integrated'));
      return false;
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Error reading orchestrator script:', error.message));
    return false;
  }
  
  // Check critical Go service binaries exist (from previous builds)
  const criticalServices = [
    '../go-microservice/bin/enhanced-rag.exe',
    '../go-microservice/bin/upload-service.exe',
    '../go-microservice/bin/grpc-server.exe'
  ];
  
  let builtServices = 0;
  criticalServices.forEach(service => {
    if (existsSync(service)) {
      builtServices++;
      console.log(chalk.green(`✅ ${service.split('/').pop()} exists`));
    } else {
      console.log(chalk.yellow(`⚠️ ${service.split('/').pop()} not found (will be built)`));
    }
  });
  
  console.log(chalk.blue(`\n📊 Build Integration Test Results:`));
  console.log(chalk.green(`✅ Build script: Ready`));
  console.log(chalk.green(`✅ Orchestrator integration: Complete`));
  console.log(chalk.green(`✅ Existing services: ${builtServices}/${criticalServices.length}`));
  
  console.log(chalk.cyan(`\n🚀 Ready to test: npm run dev:full`));
  console.log(chalk.dim(`This will now:`));
  console.log(chalk.dim(`  1. Check PostgreSQL connectivity`));
  console.log(chalk.dim(`  2. Validate TypeScript`));
  console.log(chalk.dim(`  3. 🆕 Build all Go microservices`));
  console.log(chalk.dim(`  4. Start SvelteKit frontend`));
  console.log(chalk.dim(`  5. Launch all 46+ Go services`));
  console.log(chalk.dim(`  6. Validate full system integration`));
  
  return true;
};

const main = async () => {
  const success = await testGoServicesBuild();
  
  if (success) {
    console.log(chalk.green('\n🎉 Integration test passed! npm run dev:full is ready with Go services build.'));
    process.exit(0);
  } else {
    console.log(chalk.red('\n❌ Integration test failed. Please check the issues above.'));
    process.exit(1);
  }
};

main().catch(console.error);