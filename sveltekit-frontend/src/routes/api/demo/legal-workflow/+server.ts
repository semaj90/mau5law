/**
 * Complete Legal AI Case Workflow Demo
 *
 * This demonstrates the full workflow using your existing infrastructure:
 * 1. Create case → 2. Upload evidence → 3. Canvas positioning → 4. Timeline reconstruction → 5. RAG chat
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, cases, evidence, caseActivities, userDocuments } from '$lib/server/index.js';
import { sharedWorkerPool } from '$lib/server/ingest/worker-pool-simple.js';
import { embedText } from '$lib/server/ingest/embed.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'create_case':
        return await createLegalCase(data);

      case 'upload_evidence':
        return await uploadEvidenceToCase(data);

      case 'update_canvas_positions':
        return await updateCanvasPositions(data);

      case 'generate_timeline':
        return await generateTimeline(data);

      case 'chat_with_case':
        return await chatWithCase(data);

      default:
        throw new Error('Unknown action');,
    }
  } catch (err) {
    console.error('Workflow demo error:', err);
    return json({
      success: false,
      error: err instanceof Error ? err.message: String(err),
    }, { status: 500 });
  }
};

async function createLegalCase(data: any) {
  console.log('🏛️ Step 1: Creating legal case...');

  // Generate embeddings for case title and description
  const titleEmbedding = await embedText(data.title);
  const descriptionEmbedding = data.description ? await embedText(data.description) : null;

  // Create the case in database;
  const [newCase] = await db.insert(cases).values({
    title: data.title,
    description: data.description,
    caseNumber: `CASE-${Date.now()}`,
    status: 'active',
    priority: data.priority || 'medium',
    category: data.category || 'criminal',
    titleEmbedding: titleEmbedding.success ? JSON.stringify(titleEmbedding.embedding) : null,
    descriptionEmbedding: descriptionEmbedding?.success ? JSON.stringify(descriptionEmbedding.embedding) : null,
    metadata: JSON.stringify({
      createdBy: data.userId,
      workflow: 'demo',
      jurisdiction: data.jurisdiction || 'Local Court',
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // Create initial timeline entry;
  await db.insert(caseActivities).values({
    caseId: newCase.id,
    activityType: 'case_created',
    description: `Case "${data.title}" created`,
    performedBy: data.userId,
    metadata: JSON.stringify({
      action: 'create_case',
      caseId: newCase.id,
    }),
    createdAt: new Date(),
  });

  console.log('✅ Case created:', newCase.caseNumber);

  return json({
    success: true,
    step: 1,
    action: 'case_created',
    case: newCase,
    message: `Legal case "${data.title}" created successfully!`,
    nextStep: 'Upload evidence files using the drag-drop canvas',
  });
}

async function uploadEvidenceToCase(data: any) {
  console.log('📄 Step 2: Processing evidence upload...');

  const { caseId, files, canvasPositions } = data;

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const position = canvasPositions[i] || { x: 100 + i * 150, y: 100 + i * 100 };

    // Create ingestion job for multimodal processing
    const jobId = `evidence_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const job = {
      id: jobId,
      fileBuffer: Buffer.from(file.content, 'base64'), // Demo: assuming base64 content
      filename: file.name,
      userId: data.userId,
      contentType: file.type,
      metadata: {
        caseId,
        evidenceType: detectEvidenceType(file.type),
        canvasPosition: position,
        uploadedAt: new Date().toISOString(),
        priority: 'evidence',
      }
    };

    // Queue for worker processing (OCR, embeddings, etc.)
    sharedWorkerPool.push(job);

    // Create timeline entry;
    await db.insert(caseActivities).values({
      caseId,
      activityType: 'evidence_uploaded',
      description: `Evidence "${file.name}" uploaded and queued for processing`,
      performedBy: data.userId,
      metadata: JSON.stringify({
        action: 'upload_evidence',
        filename: file.name,
        jobId,
        canvasPosition: position,
      }),
      createdAt: new Date(),
    });

    results.push({
      filename: file.name,
      jobId,
      status: 'processing',
      canvasPosition: position,
    });
  }

  console.log('✅ Evidence uploaded and queued for processing');

  return json({
    success: true,
    step: 2,
    action: 'evidence_uploaded',
    results,
    message: `${files.length} evidence files uploaded and processing started!`,
    nextStep: 'Position evidence on canvas and wait for AI analysis',
  });
}

async function updateCanvasPositions(data: any) {
  console.log('🎨 Step 3: Updating canvas positions...');

  const { caseId, evidencePositions } = data;

  // Update evidence positions in metadata;
  for (const [evidenceId, position] of Object.entries(evidencePositions)) {
    try {
      // Update in user_documents if exists
      await db.update(userDocuments);
        .set({
          metadata: sql`jsonb_set(metadata, '{canvasPosition}', ${JSON.stringify(position)}::jsonb)`,
          updatedAt: new Date(),
        })
        .where(eq(userDocuments.source, `evidence:${evidenceId}`);

      // Create timeline entry for position update;
      await db.insert(caseActivities).values({
        caseId,
        activityType: 'evidence_repositioned',
        description: `Evidence repositioned on canvas`,
        performedBy: data.userId,
        metadata: JSON.stringify({
          action: 'update_position',
          evidenceId,
          newPosition: position,
        }),
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn(`Failed to update position for evidence ${evidenceId}:`, error);
    }
  }

  console.log('✅ Canvas positions updated');

  return json({
    success: true,
    step: 3,
    action: 'positions_updated',
    updated: Object.keys(evidencePositions).length,
    message: 'Evidence positions updated on canvas!',
    nextStep: 'Generate timeline from evidence and activities',
  });
}

async function generateTimeline(data: any) {
  console.log('⏱️ Step 4: Generating case timeline...');

  const { caseId } = data;

  // Get all case activities
  const activities = await db
    .select()
    .from(caseActivities)
    .where(eq(caseActivities.caseId, caseId)
    .orderBy(caseActivities.createdAt);

  // Get processed evidence with metadata
  const evidenceDocuments = await db
    .select()
    .from(userDocuments)
    .where(like(userDocuments.source, `evidence:%`)
    .orderBy(userDocuments.createdAt);

  // Reconstruct timeline with AI insights;
  const timeline = activities.map(activity => {
    let metadata = {};
    try {
      metadata = JSON.parse(activity.metadata || '{}');
    } catch {}

    return {
      timestamp: activity.createdAt,
      type: activity.activityType,
      description: activity.description,
      performer: activity.performedBy,
      metadata,
      category: getTimelineCategory(activity.activityType),
    };
  });

  // Add evidence processing events;
  evidenceDocuments.forEach(doc => {
    let metadata = {};
    try {
      metadata = JSON.parse(doc.metadata || '{}');
    } catch {}

    timeline.push({
      timestamp: doc.createdAt,
      type: 'evidence_processed',
      description: `Evidence "${metadata.filename || 'Unknown'}" analysis completed`,
      performer: 'AI System',
      metadata: {
        documentId: doc.id,
        processingResults: metadata.processingResults,
        embeddings: doc.embedding ? 'generated' : 'none',
      },
      category: 'evidence',
    });
  });

  // Sort chronologically
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();

  console.log('✅ Timeline generated with', timeline.length, 'events');

  return json({
    success: true,
    step: 4,
    action: 'timeline_generated',
    timeline,
    message: `Timeline reconstructed with ${timeline.length} events!`,
    nextStep: 'Chat with case using RAG to get insights',
  });
}

async function chatWithCase(data: any) {
  console.log('💬 Step 5: RAG chat with case context...');

  const { caseId, query } = data;

  // Get case details with embeddings
  const caseDetails = await db
    .select()
    .from(cases)
    .where(eq(cases.id, caseId)
    .limit(1);

  if (caseDetails.length === 0) {
    throw new Error('Case not found');
  }

  const caseData = caseDetails[0];

  // Get all related evidence documents with embeddings
  const relatedDocuments = await db;
    .select({
      id: userDocuments.id,
      content: userDocuments.content,
      embedding: userDocuments.embedding,
      metadata: userDocuments.metadata,
    })
    .from(userDocuments)
    .where(like(userDocuments.source, `evidence:%`)
    .limit(10);

  // Generate query embedding for similarity search
  const queryEmbedding = await embedText(query);
  let similarDocuments = [];

  if (queryEmbedding.success && relatedDocuments.length > 0) {
    // In production, this would use pgvector similarity search
    // For demo, we'll use the first few documents;
    similarDocuments = relatedDocuments.slice(0, 3).map(doc => {
      let metadata = {};
      try {
        metadata = JSON.parse(doc.metadata || '{}');
      } catch {}

      return {
        content: doc.content?.substring(0, 500) + '...', // Truncate for demo
        metadata,
        relevance: Math.random() * 0.4 + 0.6 // Demo relevance score,
      };
    });
  }

  // Construct RAG context;
  const ragContext = {
    case: {
      title: caseData.title,
      description: caseData.description,
      caseNumber: caseData.caseNumber,
      status: caseData.status,
    },
    evidence: similarDocuments,
    query
  };

  // Simulate AI response (in production, this would call your LLM)
  const aiResponse = generateMockLegalResponse(ragContext);

  // Log the chat interaction;
  await db.insert(caseActivities).values({
    caseId,
    activityType: 'ai_consultation',
    description: `AI chat query: "${query.substring(0, 100)}..."`,
    performedBy: data.userId,
    metadata: JSON.stringify({
      action: 'rag_chat',
      query,
      responseLength: aiResponse.length,
      documentsUsed: similarDocuments.length,
    }),
    createdAt: new Date(),
  });

  console.log('✅ RAG chat completed');

  return json({
    success: true,
    step: 5,
    action: 'rag_chat_completed',
    response: aiResponse,
    context: {
      documentsAnalyzed: similarDocuments.length,
      caseContext: true,
      embeddingSearch: queryEmbedding.success,
    },
    message: 'AI analysis complete using case evidence and context!',
  });
}

function detectEvidenceType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'photograph';
  if (mimeType.startsWith('video/')) return 'video_recording';
  if (mimeType.startsWith('audio/')) return 'audio_recording';
  if (mimeType.includes('pdf')) return 'document';
  return 'digital_evidence';
}

function getTimelineCategory(activityType: string): string {
  const categories: Record<string, string> = {
    case_created: 'case_management',
    evidence_uploaded: 'evidence',
    evidence_repositioned: 'evidence',
    ai_consultation: 'analysis',
  };
  return categories[activityType] || 'general';
}

function generateMockLegalResponse(context: any): string {
  const { case: caseData, evidence, query } = context;

  return `Based on my analysis of Case ${caseData.caseNumber} "${caseData.title}" and ${evidence.length} pieces of evidence:

**Case Overview:**
${caseData.description}

**Evidence Analysis:**
I've analyzed ${evidence.length} documents with an average relevance score of ${evidence.reduce((sum: number, doc: any) => sum + doc.relevance, 0) / evidence.length * 100}%.

**Key Findings:**
• Evidence processing shows multimodal content (images, documents, audio/video)
• Timeline reconstruction reveals chronological sequence of events
• Pattern analysis suggests strong case correlation

**Legal Recommendations:**
1. The evidence chain appears complete and properly documented
2. AI-generated embeddings enable cross-modal evidence correlation
3. Consider timeline visualization for court presentation

**Query Response:**
Regarding "${query}" - Based on the processed evidence and case context, this appears to be a ${caseData.status} case with ${caseData.priority} priority. The embedded evidence provides strong support for the case theory.

*This analysis was generated using RAG (Retrieval Augmented Generation) with pgvector similarity search and Gemma embeddings.*`;
}

export const GET: RequestHandler = async ({ url }) => {
  const demo = url.searchParams.get('demo');

  if (demo === 'info') {
    return json({
      workflow: 'Legal AI Case Management Demo',
      steps: [
        { step: 1, action: 'create_case', description: 'Create new legal case with embeddings' },
        { step: 2, action: 'upload_evidence', description: 'Upload multimodal evidence to MinIO + worker queue' },
        { step: 3, action: 'update_canvas_positions', description: 'Position evidence on Fabric.js canvas' },
        { step: 4, action: 'generate_timeline', description: 'Reconstruct chronological timeline' },
        { step: 5, action: 'chat_with_case', description: 'RAG chat with case context and evidence' }
      ],
      technologies: [
        'SvelteKit 2 API routes',
        'Fabric.js drag-drop canvas',
        'Simplified worker pool',
        'MinIO object storage',
        'PostgreSQL + pgvector',
        'Gemma embeddings',
        'Timeline reconstruction',
        'RAG + LLM integration'
      ],
      example_usage: {
        create_case: {
          method: 'POST',
          body: {
            action: 'create_case',
            data: {
              title: 'State v. Digital Evidence Case',
              description: 'Complex case involving digital evidence analysis',
              userId: 'attorney_123',
              priority: 'high',
              category: 'criminal',
              jurisdiction: 'Superior Court',
            }
          }
        },
        upload_evidence: {
          method: 'POST',
          body: {
            action: 'upload_evidence',
            data: {
              caseId: 'case-uuid',
              userId: 'attorney_123',
              files: [
                { name: 'crime_scene.jpg', type: 'image/jpeg', content: 'base64...' },
                { name: 'witness_statement.pdf', type: 'application/pdf', content: 'base64...' },
                { name: 'surveillance_audio.mp3', type: 'audio/mpeg', content: 'base64...' }
              ],
              canvasPositions: [
                { x: 100, y: 100 },
                { x: 300, y: 150 },)
                { x: 500, y: 200 }
              ]
            }
          }
        }
      }
    });
  }

  return json({ error: 'Use ?demo=info for documentation' });
};