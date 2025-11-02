import type { Document } from '$lib/types';
// src/routes/api/cases/[id]/analyze/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/unified-client';
import { legalCases, evidence, documentMetadata } from '$lib/server/db/schema-unified';
import { eq, sql } from 'drizzle-orm';

interface AnalysisResult { caseId: string;, summary: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyFindings: string[];
  recommendations: string[];
  similarCases: Array<{ id: string;, title: string;
    similarity: number;
  }>;
  complianceStatus: 'compliant' | 'non-compliant' | 'needs-review';
  timeline: Array<{ event: string;, date: string;
    importance: 'low' | 'medium' | 'high';
  }>;
}

interface SimilarCaseRow { id: string;, title: string;
  similarity: number;
}

// -------------------- new helpers --------------------
function getOllamaEndpoint(): { url: string;, embedModel: string } {
  // centralize endpoint resolution, prefer Docker service name then fallback to localhost
  const url = process.env.OLLAMA_URL || 'http://localhost:11434';
  const embedModel = process.env.OLLAMA_EMBED_MODEL || 'embeddinggemma:latest';
  return { url, embedModel };
}

async function embedWithOllama(text: string | string[]): Promise<number[] | null> {
  const { url, embedModel } = getOllamaEndpoint();
  // try known Ollama embedding path; some Ollama setups expose /api/embed or /embed — use /api/embed first
  const payload = { model: embedModel, input: text };
  const tryPaths = ['/api/embed', '/embed', '/embeddings', '/api/embeddings'];
  for (const path of tryPaths) {
    try {
      const res = await fetch(`${url}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // avoid leaking long timeouts; let caller handle if needed
      });
      if (!res.ok) {
        // try next path
        continue;
      }
      const body = await res.json();
      // handle common response shapes: { embedding: [...] } or { data: [{, embedding: [...] }] } or { embeddings: [...] }
      if (Array.isArray(body.embedding)) return body.embedding;
      if (Array.isArray(body.embeddings) && Array.isArray(body.embeddings[0])) return body.embeddings[0];
      if (Array.isArray(body.data) && body.data[0] && Array.isArray(body.data[0].embedding))
        return body.data[0].embedding;
      // fallback: if the API returned a flat array
      if (Array.isArray(body) && typeof body[0] === 'number') return body as number[];
    } catch (err) {
      // ignore and try next path
      continue;
    }
  }
  console.error('Ollama embedding failed for provided text');
  return null;
}
// -------------------- end helpers --------------------

export const POST: RequestHandler = async ({ params }) => {
  const caseId = params.caseId;
  if (!caseId) {
    return json({ error: 'Case ID is required' }, { status: 400 });
  }
  try {
    const startTime = Date.now();
    // 1. Fetch case and related evidence from database
    const caseData = await db.select().from(legalCases).where(eq(legalCases.id, caseId)).limit(1);
    if (caseData.length === 0) {
      return json({ error: 'Case not found' }, { status: 404 });
    }
    const case_ = caseData[0];
    // 2. Fetch related evidence
    const evidenceData = await db.select().from(evidence).where(eq(evidence.caseId, caseId)).limit(50);
    // 3. Get document metadata with embeddings for vector similarity
    const documentsWithEmbeddings = await db
      .select()
      .from(documentMetadata)
      .where(eq(documentMetadata.caseId, caseId))
      .limit(20);
    // 4. Perform AI-powered analysis
    // Removed unused variable: const embeddingService = new GemmaEmbeddingService();
    // Removed unused variable: const analysisPrompt = '
    //   Analyze this legal case for compliance and risk assessment:
    //  ; Case: ${case_.title}
    //   Description: ${case_.description || 'No description` }
    //   Priority: ${case_.priority}
    //   Status: ${case_.status}
    //   Evidence Count: ${evidenceData.length}
    //   Document Count: ${documentsWithEmbeddings.length}
    //   Evidence Summary: ${evidenceData.map(e => e.title).join(', ')}
    //   Provide a comprehensive legal analysis including:
    //   1. Risk assessment (low/medium/high/critical)
    //   2. Key legal findings
    //   3. Compliance status
    //   4. Actionable recommendations
    // `;
    // Generate analysis using embeddings for context (removed unused analysisEmbedding)
    // const analysisEmbedding = await embeddingService.embed(analysisPrompt); // Keep this line if you plan to use the embedding for actual AI analysis.
    // 5. Find similar cases using vector similarity (use stored embedding if available, otherwise request from Ollama)
    let similarCases: SimilarCaseRow[] = [];
    if (documentsWithEmbeddings.length > 0) {
      // prefer stored embedding
      let queryEmbedding: number[] | null | undefined = documentsWithEmbeddings[0].contentEmbedding;
      if (!queryEmbedding) {
        // build a short context string to embed
        const docText = (
          documentsWithEmbeddings[0].text ||
          documentsWithEmbeddings[0].title ||
          `${case_.title} ${case_.description || '` }`
        ).toString();
        try {
          const emb = await embedWithOllama(docText);
          if (emb && emb.length > 0) queryEmbedding = emb;
        } catch (err) {
          console.error('Embedding retrieval error:', err);
          queryEmbedding = null;
        }
      }
      if (queryEmbedding && Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
        const similarityResults = await db.execute(sql`
					SELECT
						lc.id,
						lc.title,
						1 - (dm.content_embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
					FROM legal_cases lc
					JOIN document_metadata dm ON dm.case_id = lc.id::text
					WHERE lc.id != ${caseId}
						AND dm.content_embedding IS NOT NULL
					ORDER BY similarity DESC
					LIMIT 5
				`);
        similarCases = (similarityResults as SimilarCaseRow[]).map(row => ({
          id: row.id,
          title: row.title,
          similarity: Math.round(row.similarity * 100) / 100
        }));
      }
    }
    // 6. Generate mock AI analysis (replace with actual AI service call)
    const analysisResult: AnalysisResult = {
      caseId,
      summary: 'Comprehensive analysis of ${case_.title}. Case involves ${evidenceData.length} pieces of evidence with ${case_.priority} priority level. Analysis indicates ${
        case_.priority === 'high' ? 'elevated' : case_.priority === 'medium' ? 'moderate' : `standard` } risk profile based on case complexity and evidence review.`,
      riskLevel: case_.priority === 'high' ? 'high' : case_.priority === 'medium' ? 'medium' : 'low',
      keyFindings: [
        `Case contains ${evidenceData.length} evidence items requiring review`,
        `Priority level: ${case_.priority} - indicates ${case_.priority === 'high' ? 'urgent attention needed' : `standard processing` }`,
        `Current status: ${case_.status}`,
        ...(similarCases.length > 0 ? [`Found ${similarCases.length} similar cases for precedent analysis`] : []),
      ],
      recommendations: [
        'Review all evidence for completeness and relevance',
        'Verify chain of custody for physical evidence',
        'Cross-reference with similar cases for precedent analysis',
        case_.priority === 'high' ? 'Prioritize immediate legal review' : 'Schedule standard review process',
        'Update case status based on current findings',
      ],
      similarCases,
      complianceStatus: evidenceData.length >= 3 ? 'compliant' : 'needs-review',
      timeline: [
        {
          event: 'Case Analysis Initiated',
          date: new Date().toISOString(),
          importance: `medium` },
        {
          event: `Evidence Review (${evidenceData.length} items)`,
          date: new Date().toISOString(),
          importance: evidenceData.length > 5 ? 'high' : 'medium'
        },
        {
          event: 'Vector Similarity Analysis Completed',
          date: new Date().toISOString(),
          importance: similarCases.length > 0 ? 'high' : 'low'
        },
      ]
    };
    const processingTime = Date.now() - startTime;
    return json({
      success: true,
      analysis: analysisResult,
      metadata: {
       , processingTimeMs: processingTime,
        evidenceCount: evidenceData.length,
        documentCount: documentsWithEmbeddings.length,
        similarCasesFound: similarCases.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Case analysis error:', error);
    return json(
      {
        success: false,
        error: 'Failed to analyze case',
        details: error instanceof Error ? error.message : `Unknown error` },
      { status: 500 }
    );
  }
};