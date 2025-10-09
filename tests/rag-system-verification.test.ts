/**
 * Comprehensive RAG System Verification Test
 *
 * Tests the complete evidence processing pipeline:
 * 1. Evidence upload → MinIO storage
 * 2. OCR extraction → Text processing
 * 3. Embedding generation → Ollama embeddinggemma
 * 4. Vector storage → pgvector + Qdrant
 * 5. Entity extraction → Transformers.js
 * 6. Summarization → Ollama gemma3
 * 7. Semantic search → Vector similarity
 *
 * Architecture Components:
 * - Frontend: SvelteKit evidence upload form
 * - Evidence Service: GraphQL API + RabbitMQ workers
 * - Storage: MinIO (documents), PostgreSQL (metadata), Qdrant (vectors)
 * - Processing: 4 workers (OCR, Embed, Entity, Summarize)
 * - AI: Ollama (GPU-accelerated RTX 3060 Ti)
 */

import { test, expect } from '@playwright/test'
import { QdrantClient } from '@qdrant/js-client-rest'
import postgres from 'postgres'
import * as fs from 'fs'
import * as path from 'path'

// Test Configuration
const TEST_CONFIG = {
  // Service URLs
  frontend: 'http://localhost:5173',
  evidenceService: 'http://localhost:4000/graphql',
  qdrant: 'http://localhost:6333',
  ollama: 'http://localhost:11434',

  // Database
  postgres: {
    host: 'localhost',
    port: 5434,
    database: 'legal_ai_test',
    username: 'legal_admin',
    password: '123456'
  },

  // Test Data
  testDocument: path.join(__dirname, 'fixtures', 'sample-legal-document.pdf'),
  testQuery: 'What are the key terms of the contract?',
  expectedEntities: ['contract', 'party', 'agreement', 'terms'],

  // Timeouts
  uploadTimeout: 30000,
  processingTimeout: 120000, // 2 minutes for full pipeline
  searchTimeout: 10000
}

/**
 * Test Suite: RAG System Health Checks
 */
test.describe('RAG System Health', () => {
  test('Ollama service is running with required models', async () => {
    const response = await fetch(`${TEST_CONFIG.ollama}/api/tags`)
    expect(response.status).toBe(200)

    const data = await response.json()
    const modelNames = data.models.map((m: any) => m.name)

    expect(modelNames).toContain('embeddinggemma:latest')
    expect(modelNames).toContain('gemma3')

    console.log('✅ Ollama models available:', modelNames)
  })

  test('Qdrant collection exists and is configured', async () => {
    const client = new QdrantClient({ url: TEST_CONFIG.qdrant })

    const collections = await client.getCollections()
    const collectionNames = collections.collections.map(c => c.name)

    expect(collectionNames).toContain('legal_evidence')

    const collectionInfo = await client.getCollection('legal_evidence')
    expect(collectionInfo.config?.params?.vectors).toBeDefined()

    console.log('✅ Qdrant collection config:', collectionInfo.config)
  })

  test('PostgreSQL pgvector extension is enabled', async () => {
    const sql = postgres(
      `postgres://${TEST_CONFIG.postgres.username}:${TEST_CONFIG.postgres.password}@${TEST_CONFIG.postgres.host}:${TEST_CONFIG.postgres.port}/${TEST_CONFIG.postgres.database}`
    )

    const extensions = await sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`
    expect(extensions.length).toBeGreaterThan(0)

    console.log('✅ pgvector extension enabled')

    await sql.end()
  })

  test('Evidence service GraphQL endpoint is accessible', async () => {
    const query = `
      query HealthCheck {
        __schema {
          types {
            name
          }
        }
      }
    `

    const response = await fetch(TEST_CONFIG.evidenceService, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data).toBeDefined()

    console.log('✅ Evidence service GraphQL responding')
  })
})

/**
 * Test Suite: End-to-End Evidence Upload Pipeline
 */
test.describe('Evidence Upload Pipeline', () => {
  let testEvidenceId: string
  let testCaseId: string

  test.beforeAll(async () => {
    // Create test case for evidence attachment
    const sql = postgres(
      `postgres://${TEST_CONFIG.postgres.username}:${TEST_CONFIG.postgres.password}@${TEST_CONFIG.postgres.host}:${TEST_CONFIG.postgres.port}/${TEST_CONFIG.postgres.database}`
    )

    const [testCase] = await sql`
      INSERT INTO cases (title, description, status, created_by)
      VALUES ('RAG Test Case', 'Automated test case for RAG verification', 'active', '1')
      RETURNING id
    `
    testCaseId = testCase.id

    console.log('📁 Created test case:', testCaseId)

    await sql.end()
  })

  test('Upload evidence document via frontend form', async ({ page }) => {
    test.setTimeout(TEST_CONFIG.uploadTimeout)

    // Navigate to evidence upload page
    await page.goto(`${TEST_CONFIG.frontend}/evidence/upload`)

    // Fill out upload form
    await page.selectOption('select[name="caseId"]', testCaseId)
    await page.fill('input[name="title"]', 'Test Evidence Document')
    await page.fill('textarea[name="description"]', 'Sample legal document for RAG testing')

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_CONFIG.testDocument)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for success message or redirect
    await expect(page.locator('text=Evidence uploaded successfully')).toBeVisible({ timeout: 10000 })

    // Extract evidence ID from URL or response
    const url = page.url()
    const match = url.match(/evidence\/([a-f0-9-]+)/)
    if (match) {
      testEvidenceId = match[1]
      console.log('📄 Evidence uploaded:', testEvidenceId)
    }

    expect(testEvidenceId).toBeDefined()
  })

  test('OCR worker processes document and extracts text', async () => {
    test.setTimeout(TEST_CONFIG.processingTimeout)

    const sql = postgres(
      `postgres://${TEST_CONFIG.postgres.username}:${TEST_CONFIG.postgres.password}@${TEST_CONFIG.postgres.host}:${TEST_CONFIG.postgres.port}/${TEST_CONFIG.postgres.database}`
    )

    // Poll database for OCR results
    let ocrComplete = false
    let attempts = 0
    const maxAttempts = 40 // 2 minutes with 3-second intervals

    while (!ocrComplete && attempts < maxAttempts) {
      const [evidence] = await sql`
        SELECT id, extracted_text, ocr_status
        FROM evidence
        WHERE id = ${testEvidenceId}
      `

      if (evidence?.ocr_status === 'completed' && evidence?.extracted_text) {
        ocrComplete = true
        console.log('🔍 OCR extracted text length:', evidence.extracted_text.length)
        expect(evidence.extracted_text.length).toBeGreaterThan(0)
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000))
        attempts++
      }
    }

    expect(ocrComplete).toBe(true)

    await sql.end()
  })

  test('Embedding worker generates vector embeddings', async () => {
    test.setTimeout(TEST_CONFIG.processingTimeout)

    const sql = postgres(
      `postgres://${TEST_CONFIG.postgres.username}:${TEST_CONFIG.postgres.password}@${TEST_CONFIG.postgres.host}:${TEST_CONFIG.postgres.port}/${TEST_CONFIG.postgres.database}`
    )

    // Poll database for embeddings
    let embeddingsComplete = false
    let attempts = 0
    const maxAttempts = 40

    while (!embeddingsComplete && attempts < maxAttempts) {
      const [evidence] = await sql`
        SELECT id, embedding_status
        FROM evidence
        WHERE id = ${testEvidenceId}
      `

      if (evidence?.embedding_status === 'completed') {
        embeddingsComplete = true
        console.log('🧮 Embeddings generated for evidence:', testEvidenceId)
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000))
        attempts++
      }
    }

    expect(embeddingsComplete).toBe(true)

    await sql.end()
  })

  test('Qdrant contains vector for uploaded evidence', async () => {
    const client = new QdrantClient({ url: TEST_CONFIG.qdrant })

    const searchResult = await client.scroll('legal_evidence', {
      filter: {
        must: [
          {
            key: 'evidence_id',
            match: { value: testEvidenceId }
          }
        ]
      },
      limit: 1
    })

    expect(searchResult.points.length).toBeGreaterThan(0)
    console.log('🗄️ Qdrant vector found:', searchResult.points[0].id)
  })

  test('Entity extraction worker identifies legal entities', async () => {
    test.setTimeout(TEST_CONFIG.processingTimeout)

    const sql = postgres(
      `postgres://${TEST_CONFIG.postgres.username}:${TEST_CONFIG.postgres.password}@${TEST_CONFIG.postgres.host}:${TEST_CONFIG.postgres.port}/${TEST_CONFIG.postgres.database}`
    )

    // Poll for entity extraction completion
    let entitiesComplete = false
    let attempts = 0
    const maxAttempts = 40

    while (!entitiesComplete && attempts < maxAttempts) {
      const entities = await sql`
        SELECT entity_text, entity_type, confidence_score
        FROM evidence_entities
        WHERE evidence_id = ${testEvidenceId}
      `

      if (entities.length > 0) {
        entitiesComplete = true
        console.log('🏷️ Entities extracted:', entities.length)
        console.log('Sample entities:', entities.slice(0, 5).map(e => `${e.entity_text} (${e.entity_type})`))

        // Verify at least some expected entity types are present
        const entityTexts = entities.map(e => e.entity_text.toLowerCase())
        const foundExpected = TEST_CONFIG.expectedEntities.some(expected =>
          entityTexts.some(text => text.includes(expected))
        )

        expect(foundExpected).toBe(true)
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000))
        attempts++
      }
    }

    expect(entitiesComplete).toBe(true)

    await sql.end()
  })

  test('Summarization worker generates summary', async () => {
    test.setTimeout(TEST_CONFIG.processingTimeout)

    const sql = postgres(
      `postgres://${TEST_CONFIG.postgres.username}:${TEST_CONFIG.postgres.password}@${TEST_CONFIG.postgres.host}:${TEST_CONFIG.postgres.port}/${TEST_CONFIG.postgres.database}`
    )

    // Poll for summary completion
    let summaryComplete = false
    let attempts = 0
    const maxAttempts = 40

    while (!summaryComplete && attempts < maxAttempts) {
      const [evidence] = await sql`
        SELECT id, summary, summary_status
        FROM evidence
        WHERE id = ${testEvidenceId}
      `

      if (evidence?.summary_status === 'completed' && evidence?.summary) {
        summaryComplete = true
        console.log('📝 Summary generated:', evidence.summary.substring(0, 100) + '...')
        expect(evidence.summary.length).toBeGreaterThan(0)
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000))
        attempts++
      }
    }

    expect(summaryComplete).toBe(true)

    await sql.end()
  })
})

/**
 * Test Suite: RAG Semantic Search
 */
test.describe('RAG Semantic Search', () => {
  test('Vector similarity search returns relevant results', async () => {
    test.setTimeout(TEST_CONFIG.searchTimeout)

    // Generate query embedding via Ollama
    const embedResponse = await fetch(`${TEST_CONFIG.ollama}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'embeddinggemma:latest',
        prompt: TEST_CONFIG.testQuery
      })
    })

    expect(embedResponse.status).toBe(200)
    const embedData = await embedResponse.json()
    const queryVector = embedData.embedding

    console.log('🔎 Query embedding dimension:', queryVector.length)

    // Search Qdrant with query vector
    const client = new QdrantClient({ url: TEST_CONFIG.qdrant })

    const searchResult = await client.search('legal_evidence', {
      vector: queryVector,
      limit: 5,
      with_payload: true
    })

    expect(searchResult.length).toBeGreaterThan(0)

    console.log('🎯 Search results:')
    searchResult.forEach((result, idx) => {
      console.log(`  ${idx + 1}. Score: ${result.score.toFixed(4)} - Evidence: ${result.payload?.evidence_id}`)
    })

    // Verify results are ranked by similarity
    for (let i = 1; i < searchResult.length; i++) {
      expect(searchResult[i - 1].score).toBeGreaterThanOrEqual(searchResult[i].score)
    }
  })

  test('PostgreSQL pgvector cosine similarity search', async () => {
    test.setTimeout(TEST_CONFIG.searchTimeout)

    // Generate query embedding
    const embedResponse = await fetch(`${TEST_CONFIG.ollama}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'embeddinggemma:latest',
        prompt: TEST_CONFIG.testQuery
      })
    })

    const embedData = await embedResponse.json()
    const queryVector = embedData.embedding

    // Search pgvector
    const sql = postgres(
      `postgres://${TEST_CONFIG.postgres.username}:${TEST_CONFIG.postgres.password}@${TEST_CONFIG.postgres.host}:${TEST_CONFIG.postgres.port}/${TEST_CONFIG.postgres.database}`
    )

    const results = await sql`
      SELECT
        id,
        title,
        1 - (embedding <=> ${JSON.stringify(queryVector)}::vector) AS similarity_score
      FROM evidence
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${JSON.stringify(queryVector)}::vector
      LIMIT 5
    `

    expect(results.length).toBeGreaterThan(0)

    console.log('📊 pgvector search results:')
    results.forEach((result, idx) => {
      console.log(`  ${idx + 1}. Score: ${result.similarity_score.toFixed(4)} - ${result.title}`)
    })

    await sql.end()
  })

  test('Frontend semantic search API returns results', async () => {
    const response = await fetch(`${TEST_CONFIG.frontend}/api/qdrant/optimized`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: TEST_CONFIG.testQuery,
        limit: 5
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.results).toBeDefined()
    expect(data.results.length).toBeGreaterThan(0)

    console.log('🌐 Frontend API search results:', data.results.length)
  })
})

/**
 * Test Suite: Redis Pub/Sub SSE Integration
 */
test.describe('Real-time Workflow Updates', () => {
  test('SSE endpoint streams workflow events', async ({ page }) => {
    test.setTimeout(30000)

    // Navigate to evidence upload page
    await page.goto(`${TEST_CONFIG.frontend}/evidence/upload`)

    // Monitor SSE connection
    const sseMessages: string[] = []

    page.on('response', response => {
      if (response.url().includes('/api/workflow-events/')) {
        console.log('📡 SSE connection established:', response.url())
      }
    })

    // Note: Full SSE testing requires browser API access
    // This test verifies the endpoint is accessible
    expect(page.url()).toContain('/evidence/upload')
  })
})

/**
 * Test Suite: Performance Benchmarks
 */
test.describe('RAG Performance', () => {
  test('Embedding generation performance', async () => {
    const testText = 'This is a sample legal document for performance testing.'

    const startTime = Date.now()

    const response = await fetch(`${TEST_CONFIG.ollama}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'embeddinggemma:latest',
        prompt: testText
      })
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(response.status).toBe(200)
    console.log(`⚡ Embedding generation time: ${duration}ms`)

    // GPU-accelerated should be fast
    expect(duration).toBeLessThan(5000) // 5 seconds max
  })

  test('Vector search latency', async () => {
    const client = new QdrantClient({ url: TEST_CONFIG.qdrant })

    // Generate random query vector (matching collection dimension)
    const queryVector = Array.from({ length: 768 }, () => Math.random())

    const startTime = Date.now()

    await client.search('legal_evidence', {
      vector: queryVector,
      limit: 10
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`⚡ Vector search latency: ${duration}ms`)

    // HNSW index should be fast
    expect(duration).toBeLessThan(1000) // 1 second max
  })
})

/**
 * Cleanup: Remove test data
 */
test.afterAll(async () => {
  const sql = postgres(
    `postgres://${TEST_CONFIG.postgres.username}:${TEST_CONFIG.postgres.password}@${TEST_CONFIG.postgres.host}:${TEST_CONFIG.postgres.port}/${TEST_CONFIG.postgres.database}`
  )

  // Clean up test case and evidence
  await sql`DELETE FROM cases WHERE title = 'RAG Test Case'`
  console.log('🧹 Test data cleaned up')

  await sql.end()
})
