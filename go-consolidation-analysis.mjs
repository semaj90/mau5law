#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🔍 Go Microservice Consolidation Analysis');
console.log('==========================================\n');

const FUNCTIONAL_SERVICES = {
  'cuda-service-worker.go': {
    size: 26621,
    description: 'Comprehensive CUDA GPU service with RTX 3060 Ti optimization',
    functionality: 'Full CUDA task management, queue, metrics, vector search',
    status: 'KEEP - Primary CUDA service'
  },
  'legal-recommendation-engine-fixed.go': {
    size: 28014,
    description: 'Legal case recommendation engine with Redis/vector DB',
    functionality: 'Legal case matching, risk assessment, precedent analysis',
    status: 'KEEP - Core legal AI service'
  },
  'cognitive-microservice.go': {
    size: 32454,
    description: 'Cognitive processing microservice',
    functionality: 'Advanced AI processing, cognitive analysis',
    status: 'KEEP - Core AI processing'
  },
  'legal-ai-quic-server-fixed.go': {
    size: 23137,
    description: 'QUIC protocol server for high-performance streaming',
    functionality: 'Ultra-low latency QUIC communication protocol',
    status: 'KEEP - Performance optimization'
  }
};

const REDUNDANT_SERVICES = {
  'cuda-service-simple.go': {
    size: 5445,
    description: 'Simplified CUDA service',
    functionality: 'Basic CUDA functionality - subset of cuda-service-worker.go',
    status: 'REMOVE - Redundant with cuda-service-worker.go'
  },
  'simple-test.go': {
    size: 429,
    description: 'Basic test server',
    functionality: 'Hello world HTTP server',
    status: 'REMOVE - Test stub'
  },
  'test-cuda-integration.go': {
    size: 7803,
    description: 'CUDA integration test',
    functionality: 'Testing functionality only',
    status: 'ARCHIVE - Move to tests/'
  }
};

function analyzeGoFiles() {
  const allGoFiles = findGoFiles('.');

  console.log(`📊 Found ${allGoFiles.length} Go files total\n`);

  let functionalCount = 0;
  let redundantCount = 0;
  let unknownCount = 0;
  let totalFunctionalSize = 0;
  let totalRedundantSize = 0;

  console.log('🔧 FUNCTIONAL SERVICES (Keep):');
  console.log('================================');
  for (const [file, info] of Object.entries(FUNCTIONAL_SERVICES)) {
    if (allGoFiles.some(f => f.endsWith(file))) {
      console.log(`✅ ${file}`);
      console.log(`   Size: ${info.size} bytes`);
      console.log(`   Purpose: ${info.description}`);
      console.log(`   Features: ${info.functionality}`);
      console.log(`   Status: ${info.status}\n`);
      functionalCount++;
      totalFunctionalSize += info.size;
    }
  }

  console.log('🗑️  REDUNDANT SERVICES (Remove):');
  console.log('=================================');
  for (const [file, info] of Object.entries(REDUNDANT_SERVICES)) {
    if (allGoFiles.some(f => f.endsWith(file))) {
      console.log(`❌ ${file}`);
      console.log(`   Size: ${info.size} bytes`);
      console.log(`   Purpose: ${info.description}`);
      console.log(`   Reason: ${info.status}\n`);
      redundantCount++;
      totalRedundantSize += info.size;
    }
  }

  console.log('❓ OTHER GO FILES (Need Analysis):');
  console.log('===================================');
  for (const file of allGoFiles) {
    const filename = file.split(/[/\\]/).pop();
    if (!FUNCTIONAL_SERVICES[filename] && !REDUNDANT_SERVICES[filename]) {
      try {
        const stats = statSync(file);
        console.log(`🔍 ${filename} (${stats.size} bytes) - ${file}`);
        unknownCount++;
      } catch (error) {
        console.log(`❌ ${filename} - Cannot read file`);
      }
    }
  }

  console.log('\n📈 CONSOLIDATION SUMMARY:');
  console.log('=========================');
  console.log(`Total Go files: ${allGoFiles.length}`);
  console.log(`Functional services: ${functionalCount} (${totalFunctionalSize} bytes)`);
  console.log(`Redundant services: ${redundantCount} (${totalRedundantSize} bytes)`);
  console.log(`Unanalyzed files: ${unknownCount}`);
  console.log(`\nSpace savings: ${totalRedundantSize} bytes (${((totalRedundantSize / (totalFunctionalSize + totalRedundantSize)) * 100).toFixed(1)}%)`);

  return {
    functional: functionalCount,
    redundant: redundantCount,
    unknown: unknownCount,
    totalFiles: allGoFiles.length,
    spaceSavings: totalRedundantSize
  };
}

function findGoFiles(dir) {
  const files = [];

  function walk(currentDir) {
    try {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const fullPath = join(currentDir, item);
        try {
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build', '.svelte-kit'].includes(item)) {
              walk(fullPath);
            }
          } else if (stat.isFile() && fullPath.endsWith('.go')) {
            files.push(fullPath);
          }
        } catch (error) {
          // Skip files we can't access
        }
      }
    } catch (error) {
      // Skip directories we can't access
    }
  }

  walk(dir);
  return files;
}

function generateConsolidationScript() {
  const script = `#!/bin/bash

# Go Microservice Consolidation Script
# Auto-generated by go-consolidation-analysis.mjs

echo "🚀 Starting Go microservice consolidation..."

# Create backup directory
mkdir -p archived-go-services/$(date +%Y%m%d_%H%M%S)

# Archive redundant services
echo "📦 Archiving redundant services..."
${Object.keys(REDUNDANT_SERVICES).map(file =>
  `[ -f "${file}" ] && mv "${file}" archived-go-services/$(date +%Y%m%d_%H%M%S)/ && echo "✅ Archived ${file}"`
).join('\n')}

# Archive test files
echo "📦 Moving test files to tests/ directory..."
mkdir -p tests/go-integration
[ -f "test-cuda-integration.go" ] && mv "test-cuda-integration.go" tests/go-integration/ && echo "✅ Moved test-cuda-integration.go to tests/"

echo "✨ Consolidation complete!"
echo "📊 Core functional services retained:"
${Object.keys(FUNCTIONAL_SERVICES).map(file => `echo "   ✅ ${file}"`).join('\n')}

echo ""
echo "🎯 Next steps:"
echo "1. Test core services: cuda-service-worker.go, legal-recommendation-engine-fixed.go"
echo "2. Update any imports/references to archived services"
echo "3. Run 'go mod tidy' to clean dependencies"
echo "4. Update documentation"
`;

  writeFileSync('consolidate-go-services.sh', script);
  console.log('\n📝 Generated consolidation script: consolidate-go-services.sh');
}

// Run analysis
const results = analyzeGoFiles();

// Generate consolidation script
generateConsolidationScript();

console.log('\n🎯 RECOMMENDED ACTIONS:');
console.log('=======================');
console.log('1. Run: chmod +x consolidate-go-services.sh');
console.log('2. Run: ./consolidate-go-services.sh');
console.log('3. Test the 4 core services:');
console.log('   - cuda-service-worker.go (CUDA GPU processing)');
console.log('   - legal-recommendation-engine-fixed.go (Legal AI)');
console.log('   - cognitive-microservice.go (AI Processing)');
console.log('   - legal-ai-quic-server-fixed.go (High-performance protocol)');
console.log('4. Update any dependent systems');
console.log('5. Run integration tests');

console.log(`\n💡 This consolidation will reduce from ${results.totalFiles} files to ${results.functional} core services`);
console.log(`   Space savings: ${(results.spaceSavings / 1024).toFixed(1)}KB`);
console.log(`   Reduction: ${(((results.totalFiles - results.functional) / results.totalFiles) * 100).toFixed(1)}%`);