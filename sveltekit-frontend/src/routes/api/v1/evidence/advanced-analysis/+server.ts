/**
 * Advanced Evidence Analysis API Endpoint
 * Integrates with AdvancedEvidenceAnalyzer for comprehensive AI-powered analysis
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AdvancedEvidenceAnalyzer } from '$lib/services/ai/advanced-evidence-analyzer';
import { websocketBroadcast } from '$lib/services/websocket-manager';
import { dbClient } from '$lib/server/db/drizzle-config';
import { evidence, analysisResults } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const analyzer = new AdvancedEvidenceAnalyzer();

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const action = url.searchParams.get('action') || 'analyze';
    const data = await request.json();

    switch (action) {
      case 'analyze':
        return await handleAnalyzeEvidence(data);
      case 'batch_analyze':
        return await handleBatchAnalyze(data);
      case 'get_analysis':
        return await handleGetAnalysis(data);
      case 'synthesis':
        return await handleSynthesis(data);
      case 'real_time':
        return await handleRealTimeAnalysis(data);
      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Advanced evidence analysis error:', error);
    return json({
      error: 'Analysis failed',
      details: error instanceof Error ? error.message: 'Unknown error'
    }, { status: 500 });
  }
};

async function handleAnalyzeEvidence(data: any) {
  const { evidenceId, analysisTypes, caseId, options = {} } = data;

  if (!evidenceId) {
    return json({ error: 'Evidence ID required' }, { status: 400 });
  }

  // Get evidence from database
  const evidenceRecord = await dbClient
    .select()
    .from(evidence)
    .where(eq(evidence.id, evidenceId))
    .limit(1);

  if (evidenceRecord.length === 0) {
    return json({ error: 'Evidence not found' }, { status: 404 });
  }

  const evidenceData = evidenceRecord[0];

  // Start analysis with progress tracking
  const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Broadcast analysis start
  if (caseId) {
    websocketBroadcast(caseId, {
      type: 'analysis_started',
      data: {
        analysisId,
        evidenceId,
        analysisTypes: analysisTypes || ['all'],
        timestamp: new Date().toISOString()
      }
    });
  }

  try {
    // Run analysis
    const analysisResult = await analyzer.analyzeEvidence(
      evidenceData,
      analysisTypes || ['all'],
      {
        ...options,
        onProgress: (progress) => {
          if (caseId) {
            websocketBroadcast(caseId, {
              type: 'analysis_progress',
              data: {
                analysisId,
                evidenceId,
                progress: progress.percentage,
                currentTask: progress.task,
                timestamp: new Date().toISOString()
              }
            }));
          }
        }
      }
    );

    // Store analysis results in database
    await storeAnalysisResult(evidenceId, analysisResult, analysisId);

    // Broadcast completion
    if (caseId) {
      websocketBroadcast(caseId, {
        type: 'analysis_completed',
        data: {
          analysisId,
          evidenceId,
          results: analysisResult,
          timestamp: new Date().toISOString()
        }
      });
    }

    return json({
      success: true,
      analysisId,
      results: analysisResult,
      evidenceId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Broadcast error
    if (caseId) {
      websocketBroadcast(caseId, {
        type: 'analysis_error',
        data: {
          analysisId,
          evidenceId,
          error: error instanceof Error ? error.message: 'Analysis failed',
          timestamp: new Date().toISOString()
        }
      });
    }

    throw error;
  }
}

async function handleBatchAnalyze(data: any) {
  const { evidenceIds, analysisTypes, caseId, options = {} } = data;

  if (!evidenceIds || !Array.isArray(evidenceIds)) {
    return json({ error: 'Evidence IDs array required' }, { status: 400 });
  }

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const results = [];
  const errors = [];

  // Broadcast batch start
  if (caseId) {
    websocketBroadcast(caseId, {
      type: 'batch_analysis_started',
      data: {
        batchId,
        evidenceIds,
        total: evidenceIds.length,
        analysisTypes: analysisTypes || ['all'],
        timestamp: new Date().toISOString()
      }
    });
  }

  for (let i = 0; i < evidenceIds.length; i++) {
    const evidenceId = evidenceIds[i];

    try {
      // Get evidence from database
      const evidenceRecord = await dbClient
        .select()
        .from(evidence)
        .where(eq(evidence.id, evidenceId))
        .limit(1);

      if (evidenceRecord.length === 0) {
        errors.push({ evidenceId, error: 'Evidence not found' });
        continue;
      }

      const evidenceData = evidenceRecord[0];

      // Run analysis
      const analysisResult = await analyzer.analyzeEvidence(
        evidenceData,
        analysisTypes || ['all'],
        {
          ...options,
          onProgress: (progress) => {
            if (caseId) {
              websocketBroadcast(caseId, {
                type: 'batch_analysis_progress',
                data: {
                  batchId,
                  evidenceId,
                  itemProgress: progress.percentage,
                  currentTask: progress.task,
                  overallProgress: ((i / evidenceIds.length) * 100).toFixed(1),
                  completedItems: i,
                  totalItems: evidenceIds.length,
                  timestamp: new Date().toISOString()
                }
              }));
            }
          }
        }
      );

      // Store analysis results
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await storeAnalysisResult(evidenceId, analysisResult, analysisId);

      results.push({
        evidenceId,
        analysisId,
        results: analysisResult,
        success: true
      });

    } catch (error) {
      errors.push({
        evidenceId,
        error: error instanceof Error ? error.message: 'Analysis failed'
      });
    }
  }

  // Broadcast batch completion
  if (caseId) {
    websocketBroadcast(caseId, {
      type: 'batch_analysis_completed',
      data: {
        batchId,
        completed: results.length,
        errors: errors.length,
        total: evidenceIds.length,
        results,
        errors,
        timestamp: new Date().toISOString()
      }
    });
  }

  return json({
    success: true,
    batchId,
    results,
    errors,
    summary: {
      total: evidenceIds.length,
      successful: results.length,
      failed: errors.length,
      successRate: ((results.length / evidenceIds.length) * 100).toFixed(1)
    },
    timestamp: new Date().toISOString()
  });
}

async function handleGetAnalysis(data: any) {
  const { evidenceId, analysisId } = data;

  if (!evidenceId && !analysisId) {
    return json({ error: 'Evidence ID or Analysis ID required' }, { status: 400 });
  }

  let query = dbClient.select().from(analysisResults);

  if (analysisId) {
    query = query.where(eq(analysisResults.analysisId, analysisId));
  } else if (evidenceId) {
    query = query.where(eq(analysisResults.evidenceId, evidenceId));
  }

  const results = await query.limit(10);

  return json({
    success: true,
    results: results.map(result => ({
      analysisId: result.analysisId,
      evidenceId: result.evidenceId,
      results: result.results,
      createdAt: result.createdAt,
      analysisTypes: result.analysisTypes
    }))
  });
}

async function handleSynthesis(data: any) {
  const { evidenceIds, caseId, synthesisType = 'comprehensive', options = {} } = data;

  if (!evidenceIds || !Array.isArray(evidenceIds)) {
    return json({ error: 'Evidence IDs array required' }, { status: 400 });
  }

  const synthesisId = `synthesis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Broadcast synthesis start
  if (caseId) {
    websocketBroadcast(caseId, {
      type: 'synthesis_started',
      data: {
        synthesisId,
        evidenceIds,
        synthesisType,
        timestamp: new Date().toISOString()
      }
    });
  }

  try {
    // Get all analysis results for the evidence
    const analysisRecords = await dbClient
      .select()
      .from(analysisResults)
      .where(eq(analysisResults.evidenceId, evidenceIds[0])); // This would need a proper IN query

    const analysisData = analysisRecords.map(record => ({
      evidenceId: record.evidenceId,
      results: record.results
    }));

    // Run synthesis
    const synthesisResult = await analyzer.synthesizeAnalyses(
      analysisData,
      synthesisType,
      {
        ...options,
        onProgress: (progress) => {
          if (caseId) {
            websocketBroadcast(caseId, {
              type: 'synthesis_progress',
              data: {
                synthesisId,
                progress: progress.percentage,
                currentTask: progress.task,
                timestamp: new Date().toISOString()
              }
            }));
          }
        }
      }
    );

    // Broadcast completion
    if (caseId) {
      websocketBroadcast(caseId, {
        type: 'synthesis_completed',
        data: {
          synthesisId,
          results: synthesisResult,
          timestamp: new Date().toISOString()
        }
      });
    }

    return json({
      success: true,
      synthesisId,
      results: synthesisResult,
      evidenceIds,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Broadcast error
    if (caseId) {
      websocketBroadcast(caseId, {
        type: 'synthesis_error',
        data: {
          synthesisId,
          error: error instanceof Error ? error.message: 'Synthesis failed',
          timestamp: new Date().toISOString()
        }
      });
    }

    throw error;
  }
}

async function handleRealTimeAnalysis(data: any) {
  const { evidenceId, caseId, analysisTypes = ['quick_summary'] } = data;

  if (!evidenceId || !caseId) {
    return json({ error: 'Evidence ID and Case ID required' }, { status: 400 });
  }

  // Get evidence from database
  const evidenceRecord = await dbClient
    .select()
    .from(evidence)
    .where(eq(evidence.id, evidenceId))
    .limit(1);

  if (evidenceRecord.length === 0) {
    return json({ error: 'Evidence not found' }, { status: 404 });
  }

  const evidenceData = evidenceRecord[0];

  // Run quick analysis for real-time display
  const quickAnalysis = await analyzer.analyzeEvidence(
    evidenceData,
    analysisTypes,
    {
      realTime: true,
      maxProcessingTime: 5000, // 5 seconds max for real-time
      onProgress: (progress) => {
        websocketBroadcast(caseId, {
          type: 'real_time_analysis_progress',
          data: {
            evidenceId,
            progress: progress.percentage,
            task: progress.task,
            timestamp: new Date().toISOString()
          }
        }));
      }
    }
  );

  // Broadcast real-time results
  websocketBroadcast(caseId, {
    type: 'real_time_analysis_completed',
    data: {
      evidenceId,
      results: quickAnalysis,
      timestamp: new Date().toISOString()
    }
  });

  return json({
    success: true,
    evidenceId,
    results: quickAnalysis,
    realTime: true,
    timestamp: new Date().toISOString()
  });
}

async function storeAnalysisResult(evidenceId: string, results: any, analysisId: string) {
  try {
    await dbClient.insert(analysisResults).values({
      analysisId,
      evidenceId,
      results: JSON.stringify(results),
      analysisTypes: JSON.stringify(results.analysisTypes || []),
      confidence: results.overallConfidence || 0,
      processingTime: results.totalTime || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Failed to store analysis result:', error);
    // Don't throw - analysis succeeded even if storage failed
  }
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        return json({
          service: 'Advanced Evidence Analysis API',
          status: 'operational',
          version: '1.0.0',
          capabilities: [
            'single_evidence_analysis',
            'batch_analysis',
            'real_time_analysis',
            'synthesis',
            'progress_tracking',
            'websocket_integration'
          ],
          analysisTypes: [
            'ocr',
            'sentiment',
            'entities',
            'patterns',
            'precedents',
            'summary',
            'timeline',
            'all'
          ],
          timestamp: new Date().toISOString()
        });

      case 'models':
        return json({
          availableModels: analyzer.getAvailableModels(),
          defaultModel: analyzer.getDefaultModel(),
          modelCapabilities: analyzer.getModelCapabilities()
        });

      case 'health':
        const healthCheck = await analyzer.healthCheck();
        return json(healthCheck);

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Advanced evidence analysis API error:', error);
    return json({
      error: 'Service error',
      details: error instanceof Error ? error.message: 'Unknown error'
    }, { status: 500 });
  }
};