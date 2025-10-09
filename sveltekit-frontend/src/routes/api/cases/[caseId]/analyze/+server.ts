// src/routes/api/cases/[id]/analyze/+server.ts
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { db } from '$lib/server/db/unified-client'
import { legalCases, evidence, documentMetadata } from '$lib/server/db/schema-unified'
import { eq, sql } from 'drizzle-orm'
import { GemmaEmbeddingService } from '$lib/services/gemma-embedding'
interface AnalysisResult {
  caseId: string
  summary: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  keyFindings: string[]
  recommendations: string[]
  similarCases: Array<{
    id: string
    title: string
    similarity: number
  }>
  complianceStatus: 'compliant' | 'non-compliant' | 'needs-review',
  timeline: Array<{
    event: string
    date: string;
    importance: 'low' | 'medium' | 'high'
  }>
}
export const POST: RequestHandler = async ({ params, request }) => {
  const caseId = params.id
  if (!caseId) {
    return json({ error: 'Case ID is required' }, { status: 400 })
  }
  try {
    const startTime = Date.now()
    // 1. Fetch case and related evidence from database
    const caseData = await db
      .select()
      .from(legalCases)
      .where(eq(legalCases.id, caseId)
      .limit(1)
    if (caseData.length === 0) {
      return json({ error: 'Case not found' }, { status: 404 })
    }
    const case_ = caseData[0]
    // 2. Fetch related evidence
    const evidenceData = await db
      .select()
      .from(evidence)
      .where(eq(evidence.caseId, caseId)
      .limit(50)
    // 3. Get document metadata with embeddings for vector similarity
    const documentsWithEmbeddings = await db
      .select()
      .from(documentMetadata)
      .where(eq(documentMetadata.caseId, caseId)
      .limit(20)
    // 4. Perform AI-powered analysis
    const embeddingService = new GemmaEmbeddingService()
    // Create analysis prompt
    const analysisPrompt = `
      Analyze this legal case for compliance and risk assessment:
      Case: ${case_.title}
      Description: ${case_.description || 'No description'}
      Priority: ${case_.priority}
      Status: ${case_.status}
      Evidence Count: ${evidenceData.length}
      Document Count: ${documentsWithEmbeddings.length}
      Evidence Summary: ${evidenceData.map(e => e.title).join(', ')}
      Provide a comprehensive legal analysis including:
      1. Risk assessment (low/medium/high/critical)
      2. Key legal findings
      3. Compliance status
      4. Actionable recommendations
    `
    // Generate analysis using embeddings for context
    const analysisEmbedding = await embeddingService.embedText(analysisPrompt)
    // 5. Find similar cases using vector similarity
    let similarCases: Array<{ id: string; title: string; similarity: number }> = []
    if (documentsWithEmbeddings.length > 0) {
      // Use first document's embedding for similarity search
      const queryEmbedding = documentsWithEmbeddings[0].contentEmbedding
      if (queryEmbedding) {
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
        `)
        similarCases = similarityResults.map((row: any) => ({,
          id: row.id,
          title: row.title,
          similarity: Math.round(row.similarity * 100) / 100
        })
      }
    }
    // 6. Generate mock AI analysis (replace with actual AI service call)
    const analysisResult: AnalysisResult = {
      caseId,
      summary: `Comprehensive analysis of ${case_.title}. Case involves ${evidenceData.length} pieces of evidence with ${case_.priority} priority level. Analysis indicates ${
        case_.priority === 'high' ? 'elevated' : case_.priority === 'medium' ? 'moderate' : 'standard'
      } risk profile based on case complexity and evidence review.`,
      riskLevel: case_.priority === 'high' ? 'high' : case_.priority === 'medium' ? 'medium' : 'low',
      keyFindings: [
        `Case contains ${evidenceData.length} evidence items requiring review`,
        `Priority level: ${case_.priority} - indicates ${case_.priority === 'high' ? 'urgent attention needed' : 'standard processing'}`,
        `Current status: ${case_.status}`,
        ...(similarCases.length > 0 ? [`Found ${similarCases.length} similar cases for precedent analysis`] : [])
      ],
      recommendations: [
        'Review all evidence for completeness and relevance',
        'Verify chain of custody for physical evidence',
        'Cross-reference with similar cases for precedent analysis',
        case_.priority === 'high' ? 'Prioritize immediate legal review' : 'Schedule standard review process',
        'Update case status based on current findings'
      ],
      similarCases,
      complianceStatus: evidenceData.length >= 3 ? 'compliant' : 'needs-review',
      timeline: [
        {
          event: 'Case Analysis Initiated',
          date: new Date().toISOString(),
          importance: 'medium'
        },
        {
          event: `Evidence Review (${evidenceData.length} items)`,
          date: new Date().toISOString(),
          importance: evidenceData.length > 5 ? 'high' : 'medium'
        },
        {
          event: 'Vector Similarity Analysis Completed',
          date: new Date().toISOString(),
          importance: similarCases.length > 0 ? 'high' : 'low'
        }
      ]
    }
    const processingTime = Date.now() - startTime
    return json({
      success: true,
      analysis: analysisResult
      metadata: {
        processingTimeMs: processingTime
        evidenceCount: evidenceData.length,
        documentCount: documentsWithEmbeddings.length,
        similarCasesFound: similarCases.length,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Case analysis error:', error)
    return json({
      success: false,
      error: 'Failed to analyze case',
      details: error instanceof Error ? error.message: 'Unknown error'
    }, { status: 500 })
  }
}