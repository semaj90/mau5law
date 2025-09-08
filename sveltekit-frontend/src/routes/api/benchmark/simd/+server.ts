/**
 * SIMD JSON Performance Benchmark Endpoint
 * Quantifies performance gains across the legal AI data pipeline
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { simdBodyParser } from '$lib/server/simd-body-parser.js';
import { nodeSIMDJSON } from '$lib/services/node-simd-json.js';

interface BenchmarkRequest {
  iterations?: number;
  documentSize?: 'small' | 'medium' | 'large';
  testType?: 'legal' | 'general' | 'batch';
}

interface BenchmarkResult {
  testType: string;
  iterations: number;
  documentSize: string;
  standardJSON: {
    totalTime: number;
    avgTime: number;
    opsPerSecond: number;
  };
  simdJSON: {
    totalTime: number;
    avgTime: number;
    opsPerSecond: number;
  };
  performance: {
    speedupFactor: number;
    percentImprovement: number;
    timeSaved: number;
  };
  systemInfo: {
    nodeVersion: string;
    v8Version: string;
    platform: string;
    cpuCores: number;
  };
}

// Sample legal documents of varying sizes
const sampleDocuments = {
  small: {
    id: 'doc-001',
    title: 'Simple Contract Analysis',
    content: 'This contract contains basic terms and conditions. The parties agree to the following provisions under common law.',
    metadata: {
      document_type: 'contract',
      jurisdiction: 'federal',
      confidence: 0.85,
      entities: [
        { type: 'statute', text: '15 U.S.C. § 1001', confidence: 0.9 }
      ]
    }
  },
  
  medium: {
    id: 'doc-002',
    title: 'Commercial Litigation Case Analysis',
    content: 'This comprehensive legal document analyzes a complex commercial litigation matter involving multiple parties, jurisdictions, and legal precedents. '.repeat(20),
    metadata: {
      document_type: 'litigation_analysis',
      jurisdiction: 'multi-state',
      confidence: 0.92,
      parties: [
        { name: 'ABC Corporation', role: 'plaintiff', type: 'corporation' },
        { name: 'XYZ Limited', role: 'defendant', type: 'corporation' }
      ],
      practice_areas: ['commercial_law', 'contract_disputes', 'tort_law'],
      entities: [
        { type: 'case_citation', text: '123 F.3d 456', confidence: 0.95 },
        { type: 'statute', text: '28 U.S.C. § 1331', confidence: 0.88 },
        { type: 'regulation', text: '17 C.F.R. § 240.10b-5', confidence: 0.90 }
      ],
      citations: [
        { citation: '123 F.3d 456', court: 'Federal Circuit', year: 2023 },
        { citation: '456 U.S. 789', court: 'Supreme Court', year: 2022 }
      ]
    }
  },
  
  large: {
    id: 'doc-003',
    title: 'Comprehensive Legal Brief with Multiple Citations',
    content: 'This extensive legal brief contains detailed analysis of numerous legal precedents, statutory interpretations, and regulatory compliance matters spanning multiple areas of law. '.repeat(100),
    metadata: {
      document_type: 'legal_brief',
      jurisdiction: 'federal_and_state',
      confidence: 0.96,
      parties: new Array(10).fill(null).map((_, i) => ({
        name: `Party ${i + 1}`,
        role: i % 2 === 0 ? 'plaintiff' : 'defendant',
        type: i % 3 === 0 ? 'corporation' : 'individual'
      })),
      practice_areas: [
        'constitutional_law', 'administrative_law', 'contract_law', 
        'tort_law', 'criminal_law', 'tax_law', 'employment_law'
      ],
      entities: new Array(50).fill(null).map((_, i) => ({
        type: ['statute', 'regulation', 'case_citation'][i % 3],
        text: `${i + 1} U.S.C. § ${1000 + i}`,
        confidence: 0.85 + (i % 15) / 100
      })),
      citations: new Array(25).fill(null).map((_, i) => ({
        citation: `${100 + i} F.3d ${200 + i}`,
        court: ['Supreme Court', 'Federal Circuit', 'District Court'][i % 3],
        year: 2020 + (i % 4)
      }))
    }
  }
};

export const GET: RequestHandler = async ({ url }) => {
  const iterations = parseInt(url.searchParams.get('iterations') || '1000');
  const documentSize = url.searchParams.get('size') as 'small' | 'medium' | 'large' || 'medium';
  const testType = url.searchParams.get('type') as 'legal' | 'general' | 'batch' || 'legal';
  
  try {
    const benchmark = await runSIMDBenchmark({
      iterations,
      documentSize,
      testType
    });
    
    return json(benchmark);
    
  } catch (error) {
    console.error('SIMD benchmark error:', error);
    return json({ error: 'Benchmark failed' }, { status: 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  try {
    const request = await simdBodyParser.readBodyFast<BenchmarkRequest>(event);
    
    const benchmark = await runSIMDBenchmark({
      iterations: request?.iterations || 1000,
      documentSize: request?.documentSize || 'medium',
      testType: request?.testType || 'legal'
    });
    
    return json(benchmark);
    
  } catch (error) {
    console.error('SIMD benchmark error:', error);
    return json({ error: 'Benchmark failed' }, { status: 500 });
  }
};

async function runSIMDBenchmark(params: Required<BenchmarkRequest>): Promise<BenchmarkResult> {
  const { iterations, documentSize, testType } = params;
  const document = sampleDocuments[documentSize];
  const jsonString = JSON.stringify(document);
  
  console.log(`🚀 Running SIMD benchmark: ${testType}, ${documentSize}, ${iterations} iterations`);
  
  // Standard JSON benchmark
  const standardStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const serialized = JSON.stringify(document);
    const parsed = JSON.parse(serialized);
  }
  const standardTotal = performance.now() - standardStart;
  
  // SIMD JSON benchmark
  const simdStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const serialized = nodeSIMDJSON.fastStringify(document);
    const parsed = nodeSIMDJSON.fastParse(serialized);
  }
  const simdTotal = performance.now() - simdStart;
  
  // Calculate performance metrics
  const standardAvg = standardTotal / iterations;
  const simdAvg = simdTotal / iterations;
  const speedupFactor = standardTotal / simdTotal;
  const percentImprovement = ((standardTotal - simdTotal) / standardTotal) * 100;
  const timeSaved = standardTotal - simdTotal;
  
  const standardOps = 1000 / standardAvg;
  const simdOps = 1000 / simdAvg;
  
  console.log(`✅ SIMD Benchmark Results:`, {
    standardTime: `${standardTotal.toFixed(2)}ms`,
    simdTime: `${simdTotal.toFixed(2)}ms`,
    speedup: `${speedupFactor.toFixed(2)}x`,
    improvement: `${percentImprovement.toFixed(1)}%`
  });
  
  return {
    testType,
    iterations,
    documentSize,
    standardJSON: {
      totalTime: standardTotal,
      avgTime: standardAvg,
      opsPerSecond: standardOps
    },
    simdJSON: {
      totalTime: simdTotal,
      avgTime: simdAvg,
      opsPerSecond: simdOps
    },
    performance: {
      speedupFactor,
      percentImprovement,
      timeSaved
    },
    systemInfo: {
      nodeVersion: process.version,
      v8Version: process.versions.v8 || 'unknown',
      platform: process.platform,
      cpuCores: (await import('os')).cpus().length
    }
  };
}

// Additional endpoint for live performance monitoring
export const PUT: RequestHandler = async () => {
  try {
    const stats = simdBodyParser.getPerformanceStats();
    const nodeStats = nodeSIMDJSON.getPerformanceStats();
    
    return json({
      bodyParser: stats,
      nodeJSON: nodeStats,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    });
    
  } catch (error) {
    console.error('Performance stats error:', error);
    return json({ error: 'Stats collection failed' }, { status: 500 });
  }
};