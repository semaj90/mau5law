/**
 * Multi-File Evidence Batch Analysis API
 *
 * Processes multiple evidence files simultaneously with:
 * - Parallel AI analysis using multiple models
 * - Cross-document correlation detection
 * - Unified timeline extraction
 * - Batch citation verification
 * - Evidence relationship mapping
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

// Batch analysis schemas
const BatchAnalysisSchema = z.object({
  caseId: z.string().uuid('Invalid case ID'),
  files: z
    .array(
      z.object({
        id: z.string(),
        filename: z.string(),
        content: z.string(),
        type: z.enum(['document', 'image', 'video', 'audio', 'other']),
        metadata: z
          .object({
            fileSize: z.number().optional(),
            uploadDate: z.string().datetime().optional(),
            source: z.string().optional(),
          })
          .optional(),
      }),
    )
    .min(1, 'At least one file is required'),
  analysisOptions: z
    .object({
      enableCrossDocumentAnalysis: z.boolean().default(true),
      extractTimelines: z.boolean().default(true),
      detectRelationships: z.boolean().default(true),
      generateSummary: z.boolean().default(true),
      parallelProcessing: z.boolean().default(true),
      confidenceThreshold: z.number().min(0).max(1).default(0.7),
      maxConcurrency: z.number().min(1).max(10).default(4),
    })
    .default({}),
});

// Configuration
const OLLAMA_BASE_URL = 'http://localhost:11434';
const LEGAL_MODEL_GPU = 'gemma3-legal:latest';
const LEGAL_MODEL_FALLBACK = 'gemma3:270m';

// AI Integration
async function analyzeDocumentBatch(files: any[], options: any) {
  const model = await getOptimalModel();

  // Process files in parallel if enabled
  if (options.parallelProcessing) {
    return await processBatchParallel(files, model, options);
  } else {
    return await processBatchSequential(files, model, options);
  }
}

async function processBatchParallel(files: any[], model: string, options: any) {
  const concurrency = Math.min(options.maxConcurrency, files.length);
  const batches = [];

  // Split files into concurrent batches
  for (let i = 0; i < files.length; i += concurrency) {
    batches.push(files.slice(i, i + concurrency));
  }

  const results = [];

  for (const batch of batches) {
    const batchPromises = batch.map(file => analyzeSingleDocument(file, model));
    const batchResults = await Promise.allSettled(batchPromises);

    results.push(
      ...batchResults.map((result, index) => ({
        fileId: batch[index].id,
        filename: batch[index].filename,
        success: result.status === 'fulfilled',
        analysis: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null,
      })),
    );
  }

  return results;
}

async function processBatchSequential(files: any[], model: string, options: any) {
  const results = [];

  for (const file of files) {
    try {
      const analysis = await analyzeSingleDocument(file, model);
      results.push({
        fileId: file.id,
        filename: file.filename,
        success: true,
        analysis,
        error: null,
      });
    } catch (error) {
      results.push({
        fileId: file.id,
        filename: file.filename,
        success: false,
        analysis: null,
        error: error.message,
      });
    }
  }

  return results;
}

async function analyzeSingleDocument(file: any, model: string) {
  const analysisPrompt = `Analyze this legal evidence document and provide comprehensive analysis:

DOCUMENT: ${file.filename}
TYPE: ${file.type}
CONTENT: ${file.content.substring(0, 3000)}${file.content.length > 3000 ? '...' : ''}

Provide analysis in this exact JSON format:
{
  "summary": "Brief document summary",
  "confidence": 0.85,
  "document_type": "contract|court_filing|correspondence|report|other",
  "key_entities": ["Person A", "Company B", "Location C"],
  "important_dates": [
    {"date": "2024-01-15", "event": "Contract signed", "confidence": 0.9}
  ],
  "legal_issues": ["Contract breach", "Statutory violation"],
  "evidence_strength": 0.8,
  "recommendations": ["Verify signatures", "Check jurisdiction"],
  "cross_references": ["Other document mentions", "Related case citations"],
  "timeline_events": [
    {"date": "2024-01-15T10:00:00Z", "description": "Event occurred", "importance": 0.9}
  ]
}`;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: analysisPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          num_predict: 1536,
          num_ctx: 6144,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();

    // Parse AI response
    let analysisResult;
    try {
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      // Fallback analysis
      analysisResult = {
        summary: `Analysis of ${file.filename}`,
        confidence: 0.5,
        document_type: file.type,
        key_entities: [],
        important_dates: [],
        legal_issues: ['Requires manual review'],
        evidence_strength: 0.5,
        recommendations: ['Manual legal review required'],
        cross_references: [],
        timeline_events: [],
      }
    }

    return analysisResult;
  } catch (error) {
    throw new Error(`Document analysis failed: ${error.message}`);
  }
}

// Cross-document analysis
async function performCrossDocumentAnalysis(analysisResults: any[]) {
  const allEntities = analysisResults.flatMap(result => result.analysis?.key_entities || []);

  const allDates = analysisResults.flatMap(result => result.analysis?.important_dates || []);

  const allIssues = analysisResults.flatMap(result => result.analysis?.legal_issues || []);

  // Find entity correlations
  const entityFrequency = allEntities.reduce((acc, entity) => {
    acc[entity] = (acc[entity] || 0) + 1;
    return acc;
  }, {});

  const commonEntities = Object.entries(entityFrequency)
    .filter(([_, count]) => count > 1)
    .map(([entity, count]) => ({ entity, frequency: count }));

  // Find date patterns
  const datePatterns = allDates
    .filter(dateObj => dateObj.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Find common legal issues
  const issueFrequency = allIssues.reduce((acc, issue) => {
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {});

  const commonIssues = Object.entries(issueFrequency)
    .filter(([_, count]) => count > 1)
    .map(([issue, count]) => ({ issue, frequency: count }));

  return {
    correlation_analysis: {
      common_entities: commonEntities,
      date_patterns: datePatterns,
      common_legal_issues: commonIssues,
      document_relationships: generateDocumentRelationships(analysisResults),
    },
    unified_timeline: generateUnifiedTimeline(analysisResults),
    summary_insights: {
      total_documents: analysisResults.length,
      successful_analyses: analysisResults.filter(r => r.success).length,
      key_correlations: commonEntities.length + commonIssues.length,
      timeline_events: datePatterns.length,
    },
  }
}

function generateDocumentRelationships(analysisResults: any[]) {
  const relationships = [];

  for (let i = 0; i < analysisResults.length; i++) {
    for (let j = i + 1; j < analysisResults.length; j++) {
      const doc1 = analysisResults[i];
      const doc2 = analysisResults[j];

      if (!doc1.analysis || !doc2.analysis) continue;

      const commonEntities = (doc1.analysis.key_entities || []).filter(entity =>
        (doc2.analysis.key_entities || []).includes(entity),
      );

      const commonIssues = (doc1.analysis.legal_issues || []).filter(issue =>
        (doc2.analysis.legal_issues || []).includes(issue),
      );

      if (commonEntities.length > 0 || commonIssues.length > 0) {
        relationships.push({
          document1: doc1.filename,
          document2: doc2.filename,
          relationship_strength: (commonEntities.length + commonIssues.length) / 10,
          common_elements: {
            entities: commonEntities,
            legal_issues: commonIssues,
          },
        });
      }
    }
  }

  return relationships;
}

function generateUnifiedTimeline(analysisResults: any[]) {
  const allTimelineEvents = analysisResults
    .filter(result => result.analysis?.timeline_events)
    .flatMap(result =>
      result.analysis.timeline_events.map(event => ({
        ...event,
        source_document: result.filename,
      })),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    events: allTimelineEvents,
    date_range: {
      earliest: allTimelineEvents[0]?.date || null,
      latest: allTimelineEvents[allTimelineEvents.length - 1]?.date || null,
    },
    event_count: allTimelineEvents.length,
  }
}

// GPU detection
async function detectGPU(): Promise<boolean> {
  try {
    // removed unused response assignment
    return response.ok;
  } catch {
    return false;
  }
}

async function getOptimalModel(): Promise<string> {
  const hasGPU = await detectGPU();
  return hasGPU ? LEGAL_MODEL_GPU : LEGAL_MODEL_FALLBACK;
}

/**
 * POST /api/v1/evidence/batch-analyze - Analyze multiple evidence files
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Check authentication (allow test mode)
    const isTestMode = request.headers.get('x-test-mode') === 'true';
    if (!isTestMode && (!locals.session || !locals.user)) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { caseId, files, analysisOptions } = BatchAnalysisSchema.parse(body);

    console.log(`Starting batch analysis for ${files.length} files...`);
    const startTime = Date.now();

    // Analyze all documents
    const analysisResults = await analyzeDocumentBatch(files, analysisOptions);

    // Perform cross-document analysis if enabled
    let crossDocumentAnalysis = null;
    if (analysisOptions.enableCrossDocumentAnalysis) {
      crossDocumentAnalysis = await performCrossDocumentAnalysis(analysisResults);
    }

    const processingTime = Date.now() - startTime;
    const successCount = analysisResults.filter(r => r.success).length;

    return json({
      success: true,
      data: {
        caseId,
        batch_analysis: {
          individual_results: analysisResults,
          cross_document_analysis: crossDocumentAnalysis,
          processing_summary: {
            total_files: files.length,
            successful_analyses: successCount,
            failed_analyses: files.length - successCount,
            processing_time_ms: processingTime,
            analysis_options: analysisOptions,
          },
          metadata: {
            model_used: await getOptimalModel(),
            processed_at: new Date().toISOString(),
            user_id: isTestMode ? 'test-user' : locals.user.id,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Batch analysis failed:', error);

    if (error instanceof z.ZodError) {
      return json(
        {
          message: 'Invalid batch analysis request',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return json(
      {
        message: 'Batch analysis failed',
        details: error.message || 'Unknown error',
      },
      { status: 500 },
    );
  }
}
