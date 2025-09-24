#!/usr/bin/env node

/**
 * Test Evidence Anal        headers: {
        'Content-Type': 'application/json',
        'x-test-mode': 'true'
      }, AI Integration
 * Tests the complete evidence analysis workflow with real AI
 */

const EVIDENCE_API = 'http://localhost:5174/api/v1/evidence/analyze'

const testEvidence = {
  evidenceId: crypto.randomUUID(),
  filename: 'sample-legal-document.txt',
  content: `
    POLICE INCIDENT REPORT
    Case Number: 2024-10-15-001

    INCIDENT DETAILS:
    Date: October 15, 2024
    Time: 14:30 hrs
    Location: 123 Main Street, Downtown Legal District

    SUMMARY:
    Officers responded to a reported contract dispute between two business entities.
    Upon arrival, found evidence of potential breach of fiduciary duty.
    Several financial documents were collected as evidence, including:
    - Banking statements showing irregular transfers
    - Email communications discussing the disputed contract terms
    - Witness statements from employees

    EVIDENCE COLLECTED:
    1. Financial records (Items 001-005)
    2. Email printouts (Items 006-012)
    3. Witness statements (Items 013-015)

    RECOMMENDATION:
    Case requires further legal analysis for potential civil litigation.
    Evidence suggests possible damages in excess of $50,000.
  `,
  type: 'document'
}

console.log('🧪 Testing Evidence Analysis AI Integration...\n')

async function testEvidenceAnalysis() {
  try {
    console.log('📤 Sending evidence to AI analysis endpoint...')

    const response = await fetch(EVIDENCE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=test-session-123' // Mock session
      },
      body: JSON.stringify(testEvidence)
    })

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.status} - ${response.statusText}`)
    }

    const result = await response.json()

    console.log('✅ AI Analysis Complete!\n')
    console.log('📊 ANALYSIS RESULTS:')
    console.log('═'.repeat(50))

    if (result.success && result.data) {
      const analysis = result.data.analysis

      console.log(`📋 Summary: ${analysis.summary}`)
      console.log(`🎯 Confidence: ${(analysis.confidence * 100).toFixed(1)}%`)
      console.log(`⚖️  Legal Relevance: ${analysis.legalRelevance}`)
      console.log(`📈 Prosecution Score: ${(analysis.prosecutionScore * 100).toFixed(1)}%`)
      console.log(`🏛️  Model Used: ${result.data.model}`)
      console.log(`⏰ Processed: ${result.data.processedAt}`)

      if (analysis.relevantLaws && analysis.relevantLaws.length > 0) {
        console.log('\n📚 RELEVANT LAWS:')
        analysis.relevantLaws.forEach((law, i) => {
          console.log(`  ${i + 1}. ${law}`)
        })
      }

      if (analysis.keyFindings && analysis.keyFindings.length > 0) {
        console.log('\n🔍 KEY FINDINGS:')
        analysis.keyFindings.forEach((finding, i) => {
          console.log(`  ${i + 1}. ${finding}`)
        })
      }

      if (analysis.recommendations && analysis.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:')
        analysis.recommendations.forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec}`)
        })
      }

      if (analysis.suggestedTags && analysis.suggestedTags.length > 0) {
        console.log('\n🏷️  SUGGESTED TAGS:')
        console.log(`  ${analysis.suggestedTags.join(', ')}`)
      }

      if (result.data.embedding) {
        console.log(`\n🧮 CUDA Embedding: Generated (${result.data.embedding.length} dimensions)`)
      }

    } else {
      console.log('❌ Analysis failed or returned invalid data')
      console.log(JSON.stringify(result, null, 2))
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)

    // Show helpful debugging info
    console.log('\n🔧 DEBUG INFO:')
    console.log('- Make sure SvelteKit dev server is running on http://localhost:5173')
    console.log('- Ensure Ollama is running with gemma3-legal:latest model')
    console.log('- Check that Docker containers (postgres, redis) are up')
    console.log('- Verify CUDA service is available if using GPU acceleration')
  }
}

// Run the test
testEvidenceAnalysis()