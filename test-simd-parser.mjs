// Test script for Unified SIMD Parser
// Tests JSON cleaning and parsing capabilities

import { unifiedSIMDParser, ParseMode } from './src/lib/services/unified-simd-parser.js';

console.log('🚀 Testing Unified SIMD Parser JSON cleaning...');

// Test cases that would cause PostgreSQL "invalid input syntax for type json" errors
const testCases = [
  {
    name: 'Control Characters',
    json: '{"evidence":"test\u0000data", "content":"legal\u0001document"}'
  },
  {
    name: 'Malformed Escaping',
    json: '{"evidence":"test\\malformed", "content":"test\\nwith\\nlines"}'
  },
  {
    name: 'Trailing Commas',
    json: '{"evidence":"test", "metadata":{"type":"legal",}, "content":"document",}'
  },
  {
    name: 'Large Legal Document',
    json: JSON.stringify({
      id: "legal-doc-001",
      title: "Contract Analysis with Special Characters",
      content: "This contract contains special characters: \u0000\u0001\u0002 and newlines\nand tabs\t",
      metadata: {
        citations: ["123 F.3d 456", "789 U.S. 123"],
        entities: ["Supreme Court", "District Court"],
        confidence: 0.95
      }
    })
  }
];

async function testSIMDParser() {
  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`Original: ${testCase.json.substring(0, 100)}...`);
    
    try {
      const result = await unifiedSIMDParser.parseOptimal(testCase.json, ParseMode.LEGAL_DOCUMENT);
      console.log(`✅ Success: ${result.backend_used} (${result.memory_bank})`);
      console.log(`⏱️ Parse time: ${result.parse_time_ms}ms`);
      
      if (result.legal_entities) {
        console.log(`🏛️ Legal entities found: ${result.legal_entities}`);
      }
      if (result.citations) {
        console.log(`📚 Citations found: ${result.citations.length}`);
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }

  // Test batch processing
  console.log('\n🔄 Testing batch processing...');
  try {
    const jsonStrings = testCases.map(tc => tc.json);
    const results = await unifiedSIMDParser.parseBatch(jsonStrings, ParseMode.LEGAL_DOCUMENT);
    console.log(`✅ Batch processed ${results.length} documents`);
    results.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.backend_used} (${result.parse_time_ms}ms)`);
    });
  } catch (error) {
    console.log(`❌ Batch failed: ${error.message}`);
  }

  // Test performance benchmarking
  console.log('\n🚀 Running performance benchmark...');
  try {
    const benchmarks = await unifiedSIMDParser.benchmarkAllBackends(100);
    console.log('📊 Benchmark results (100 iterations):');
    Object.entries(benchmarks).forEach(([backend, time]) => {
      console.log(`  ${backend}: ${time}ms`);
    });
  } catch (error) {
    console.log(`❌ Benchmark failed: ${error.message}`);
  }

  // Test comprehensive stats
  console.log('\n📈 Getting comprehensive stats...');
  try {
    const stats = await unifiedSIMDParser.getExtendedStats();
    console.log('💾 Memory usage:', stats.memory_usage);
    console.log('🔧 Backends available:', stats.backends_available.join(', '));
    console.log('📊 Cache hit rates:', JSON.stringify(stats.cache_hit_rates));
  } catch (error) {
    console.log(`❌ Stats failed: ${error.message}`);
  }
}

testSIMDParser().catch(console.error);