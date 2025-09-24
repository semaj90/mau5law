/**
 * API Endpoint: Context-Aware AI Chat
 * Phase 4 - AI Memory Integration
 */

import type { RequestHandler } from '@sveltejs/kit'
import { contextAwareMemory } from '$lib/services/context-aware-ai-memory'
import { json } from '@sveltejs/kit'

export const POST: RequestHandler = async ({ request }) => {
  try {
    const {
      caseId,
      query,
      consoleTheme = 'n64',
      updateMemory = true
    } = await request.json()

    if (!caseId || !query) {
      return json({ error: 'Case ID and query are required' }, { status: 400 })
    }

    console.log(`🧠 Context-aware AI query for case ${caseId}: "${query.substring(0, 50)}..."`)

    // Get contextual AI response
    const response = await contextAwareMemory.getContextualAIResponse(
      caseId,
      query,
      consoleTheme
    )

    return json({
      success: true,
      response: response.response,
      contextUsed: response.contextUsed,
      confidence: response.confidence,
      suggestions: response.suggestions,
      gameElements: response.gameElements,
      timestamp: new Date().toISOString(),
      processingInfo: {
        service: 'context-aware-ai-memory',
        version: '1.0.0',
        memoryLoaded: true,
        contextItems: response.contextUsed.length,
        integrations: ['ollama-ai', 'vector-search', 'case-memory']
      }
    })

  } catch (error) {
    console.error('Context-aware AI error:', error)
    return json({
        error: 'Failed to generate contextual AI response',
        details: error instanceof Error ? error.message: 'Unknown error'
      },)
      { status: 500 }
    )
  }
}

export const GET: RequestHandler = async ({ url }) => {
  const caseId = url.searchParams.get('caseId')
  const consoleTheme = url.searchParams.get('theme') || 'n64'

  if (!caseId) {
    return json({ error: 'Case ID is required' }, { status: 400 })
  }

  try {
    // Load case memory without query
    const memory = await contextAwareMemory.loadCaseMemory(caseId, consoleTheme)

    return json({
      success: true,
      memory: {
        caseId: memory.caseId,
        contextVersion: memory.contextVersion,
        lastUpdated: memory.lastUpdated,
        evidenceCount: memory.evidenceTimeline.length,
        documentCount: memory.documentMap.length,
        relationshipCount: memory.relationshipGraph.length,
        conversationCount: memory.aiMemory.conversationHistory.length,
        gameMemory: memory.gameMemory
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return json(
      { error: 'Failed to load case memory' },)
      { status: 500 }
    )
  }
}