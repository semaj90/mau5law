#!/usr/bin/env node

/**
 * Comprehensive Evidence Analysis System Test
 * Tests all integrated features:
 * - Multi-file batch analysis
 * - Timeline extraction
 * - Legal citations discovery
 * - Evidence canvas integration
 * - Cross-document relationship mapping
 */

const BASE_URL = 'http://localhost:5174'

const testCaseId = `TEST-CASE-${Date.now()}`

// Sample evidence files for testing
const sampleEvidenceFiles = [
  {
    id: 'doc-1',
    filename: 'contract-agreement.txt',
    type: 'document',
    content: `
      LEGAL CONTRACT AGREEMENT

      Date: January 15, 2024
      Parties: ABC Corporation and XYZ Ltd.

      Terms:
      1. ABC Corporation agrees to provide consulting services
      2. Contract effective from January 15, 2024 to December 31, 2024
      3. Payment terms: $50,000 quarterly
      4. Breach notification required within 30 days

      Signed:
      John Smith, CEO ABC Corporation - January 15, 2024
      Jane Doe, CFO XYZ Ltd. - January 15, 2024

      Witnesses:
      - Attorney Mike Johnson (Bar #12345)
      - Notary Sarah Williams
    `,
    metadata: {
      fileSize: 1024,
      uploadDate: new Date().toISOString()
    }
  },
  {
    id: 'doc-2',
    filename: 'breach-notice.txt',
    type: 'document',
    content: `
      BREACH OF CONTRACT NOTICE

      Date: March 20, 2024
      From: XYZ Ltd. Legal Department
      To: ABC Corporation

      RE: Contract Agreement dated January 15, 2024

      This notice serves to inform ABC Corporation that they are in breach
      of the contract agreement signed on January 15, 2024.

      Specific breaches:
      - Failure to deliver consulting report by February 28, 2024
      - Non-payment of Q1 invoice ($50,000) due March 1, 2024
      - Violation of confidentiality clause on March 10, 2024

      Remedy period: 30 days from receipt of notice
      Legal action may be taken if not remedied by April 20, 2024

      Attorney: Mike Johnson (Bar #12345)
      Law Firm: Johnson & Associates
    `,
    metadata: {
      fileSize: 856,
      uploadDate: new Date().toISOString()
    }
  },
  {
    id: 'doc-3',
    filename: 'witness-statement.txt',
    type: 'document',
    content: `
      WITNESS STATEMENT

      Date: March 25, 2024
      Witness: Sarah Williams, Notary Public

      I, Sarah Williams, witnessed the signing of the contract between
      ABC Corporation and XYZ Ltd. on January 15, 2024 at 2:30 PM
      at the XYZ Ltd. offices located at 123 Business Plaza.

      Present at signing:
      - John Smith (ABC Corporation CEO)
      - Jane Doe (XYZ Ltd. CFO)
      - Mike Johnson (Legal counsel)
      - Myself as notary

      The contract was read aloud and both parties acknowledged
      understanding of all terms before signing.

      Timeline of events:
      - 2:00 PM: Parties arrived for meeting
      - 2:15 PM: Contract review began
      - 2:30 PM: Contract signing completed
      - 2:45 PM: Documents notarized

      Statement given under oath on March 25, 2024

      Signature: Sarah Williams, Notary Public
      Commission expires: December 31, 2026
    `,
    metadata: {
      fileSize: 967,
      uploadDate: new Date().toISOString()
    }
  }
]

console.log('🧪 Testing Comprehensive Evidence Analysis System...\n')
console.log(`📋 Test Case ID: ${testCaseId}`)
console.log(`🔗 Base URL: ${BASE_URL}\n`)

async function testBatchAnalysis() {
  console.log('1️⃣ Testing Multi-File Batch Analysis...')

  try {
    const response = await fetch(`${BASE_URL}/api/v1/evidence/batch-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-mode': 'true'
      },
      body: JSON.stringify({
        caseId: testCaseId,
        files: sampleEvidenceFiles,
        analysisOptions: {
          enableCrossDocumentAnalysis: true,
          extractTimelines: true,
          detectRelationships: true,
          generateSummary: true,
          parallelProcessing: true,
          confidenceThreshold: 0.7,
          maxConcurrency: 3
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Batch analysis failed: ${response.status} - ${response.statusText}`)
    }

    const result = await response.json()

    console.log('✅ Batch Analysis Results:')
    console.log(`   📊 Total Files: ${result.data.batch_analysis.processing_summary.total_files}`)
    console.log(`   ✅ Successful: ${result.data.batch_analysis.processing_summary.successful_analyses}`)
    console.log(`   ⏱️  Processing Time: ${result.data.batch_analysis.processing_summary.processing_time_ms}ms`)
    console.log(`   🤖 Model Used: ${result.data.batch_analysis.metadata.model_used}`)

    if (result.data.batch_analysis.cross_document_analysis) {
      const crossAnalysis = result.data.batch_analysis.cross_document_analysis
      console.log(`   🔗 Common Entities: ${crossAnalysis.correlation_analysis.common_entities.length}`)
      console.log(`   📋 Document Relationships: ${crossAnalysis.correlation_analysis.document_relationships.length}`)
      console.log(`   ⏰ Timeline Events: ${crossAnalysis.unified_timeline.event_count}`)
    }

    console.log('\n')
    return result.data.batch_analysis

  } catch (error) {
    console.error('❌ Batch analysis test failed:', error.message)
    return null
  }
}

async function testTimelineExtraction() {
  console.log('2️⃣ Testing Timeline Extraction...')

  try {
    const combinedContent = sampleEvidenceFiles
      .map(file => `--- ${file.filename} ---\n${file.content}`)
      .join('\n\n')

    const response = await fetch(`${BASE_URL}/api/v1/timeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-mode': 'true'
      },
      body: JSON.stringify({
        caseId: testCaseId,
        content: combinedContent,
        documentType: 'other',
        extractionOptions: {
          includeImpliedDates: true,
          confidenceThreshold: 0.7,
          maxEvents: 50,
          enableEntityLinking: true,
          mergeSimilarEvents: true
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Timeline extraction failed: ${response.status} - ${response.statusText}`)
    }

    const result = await response.json()

    console.log('✅ Timeline Extraction Results:')
    console.log(`   ⏰ Total Events: ${result.data.timeline.events.length}`)
    console.log(`   📅 Date Range: ${result.data.timeline.summary.date_range.earliest} to ${result.data.timeline.summary.date_range.latest}`)
    console.log(`   🎯 Confidence: ${(result.data.timeline.summary.confidence.overall_confidence * 100).toFixed(1)}%`)
    console.log(`   🛠️  Extraction Method: ${result.data.timeline.summary.extraction_method}`)

    console.log('\n   📋 Timeline Events:')
    result.data.timeline.events.forEach((event, index) => {
      console.log(`      ${index + 1}. ${new Date(event.date).toLocaleDateString()} - ${event.description}`)
    })

    console.log('\n')
    return result.data.timeline

  } catch (error) {
    console.error('❌ Timeline extraction test failed:', error.message)
    return null
  }
}

async function testCitationsDiscovery() {
  console.log('3️⃣ Testing Legal Citations Discovery...')

  try {
    const response = await fetch(`${BASE_URL}/api/v1/citations?caseId=${testCaseId}&test-mode=true`)

    if (!response.ok) {
      throw new Error(`Citations discovery failed: ${response.status} - ${response.statusText}`)
    }

    const result = await response.json()

    console.log('✅ Citations Discovery Results:')
    console.log(`   📚 Total Citations: ${result.data.citations.length}`)
    console.log(`   ✅ Verified Citations: ${result.data.citations.filter(c => c.verified).length}`)
    console.log(`   📊 Average Relevance: ${(result.data.citations.reduce((sum, c) => sum + c.relevanceScore, 0) / result.data.citations.length).toFixed(1)}`)

    console.log('\n   📋 Sample Citations:')
    result.data.citations.slice(0, 3).forEach((citation, index) => {
      console.log(`      ${index + 1}. ${citation.title} (${citation.citationType})`)
      console.log(`         Relevance: ${citation.relevanceScore}/10`)
    })

    console.log('\n')
    return result.data

  } catch (error) {
    console.error('❌ Citations discovery test failed:', error.message)
    return null
  }
}

async function testEvidenceCanvasAnalysis() {
  console.log('4️⃣ Testing Evidence Canvas Analysis...')

  try {
    const mockCanvasData = {
      canvas_json: JSON.stringify({
        version: '5.2.4',
        objects: [
          {
            type: 'rect',
            left: 100,
            top: 100,
            width: 200,
            height: 100,
            fill: 'red'
          },
          {
            type: 'text',
            left: 150,
            top: 200,
            text: 'Contract Evidence',
            fontSize: 16
          },
          {
            type: 'text',
            left: 150,
            top: 250,
            text: 'Breach Notice',
            fontSize: 16
          }
        ]
      }),
      objects: [
        { type: 'rect', text: null },
        { type: 'text', text: 'Contract Evidence' },
        { type: 'text', text: 'Breach Notice' }
      ],
      canvas_size: { width: 800, height: 600 },
      options: {
        analyze_layout: true,
        extract_entities: true,
        generate_summary: true
      }
    }

    const response = await fetch(`${BASE_URL}/api/evidence-canvas/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockCanvasData)
    })

    if (!response.ok) {
      throw new Error(`Canvas analysis failed: ${response.status} - ${response.statusText}`)
    }

    const result = await response.json()

    console.log('✅ Evidence Canvas Analysis Results:')
    console.log(`   🎨 Canvas Objects: ${mockCanvasData.objects.length}`)
    console.log(`   📝 Text Elements: ${mockCanvasData.objects.filter(obj => obj.text).length}`)
    console.log(`   📊 Analysis Confidence: ${result.confidence}`)
    console.log(`   ⏱️  Processing Time: ${result.processing_time_ms}ms`)

    console.log('\n   📋 Analysis Summary:')
    console.log(`      ${result.summary}`)

    console.log('\n')
    return result

  } catch (error) {
    console.error('❌ Canvas analysis test failed:', error.message)
    return null
  }
}

async function testEvidenceWorkspace() {
  console.log('5️⃣ Testing Evidence Workspace Integration...')

  try {
    const response = await fetch(`${BASE_URL}/evidence-workspace`)

    if (!response.ok) {
      throw new Error(`Workspace access failed: ${response.status} - ${response.statusText}`)
    }

    console.log('✅ Evidence Workspace accessible')
    console.log('   🌐 URL: http://localhost:5174/evidence-workspace')
    console.log('   📱 Features: Multi-file upload, batch analysis, timeline, citations, canvas')

    console.log('\n')
    return true

  } catch (error) {
    console.error('❌ Workspace test failed:', error.message)
    return false
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive Evidence Analysis System Test\n')
  console.log('=' .repeat(70))

  const results = {
    batchAnalysis: await testBatchAnalysis(),
    timelineExtraction: await testTimelineExtraction(),
    citationsDiscovery: await testCitationsDiscovery(),
    canvasAnalysis: await testEvidenceCanvasAnalysis(),
    workspaceAccess: await testEvidenceWorkspace()
  }

  console.log('=' .repeat(70))
  console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY')
  console.log('=' .repeat(70))

  const successCount = Object.values(results).filter(result => result !== null && result !== false).length
  const totalTests = Object.keys(results).length

  console.log(`✅ Successful Tests: ${successCount}/${totalTests}`)
  console.log(`📈 Success Rate: ${((successCount / totalTests) * 100).toFixed(1)}%`)

  console.log('\n🎯 FEATURE STATUS:')
  console.log(`   🔍 Multi-file Batch Analysis: ${results.batchAnalysis ? '✅ WORKING' : '❌ FAILED'}`)
  console.log(`   ⏰ Timeline Extraction: ${results.timelineExtraction ? '✅ WORKING' : '❌ FAILED'}`)
  console.log(`   📚 Legal Citations: ${results.citationsDiscovery ? '✅ WORKING' : '❌ FAILED'}`)
  console.log(`   🎨 Evidence Canvas: ${results.canvasAnalysis ? '✅ WORKING' : '❌ FAILED'}`)
  console.log(`   🌐 Workspace Integration: ${results.workspaceAccess ? '✅ WORKING' : '❌ FAILED'}`)

  if (successCount === totalTests) {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL!')
    console.log('   The comprehensive evidence analysis system is fully functional.')
    console.log('   🔗 Access the workspace at: http://localhost:5174/evidence-workspace')
  } else {
    console.log('\n⚠️  SOME ISSUES DETECTED')
    console.log('   Check the error details above and ensure all services are running.')
  }

  console.log('\n🔧 SYSTEM REQUIREMENTS:')
  console.log('   - SvelteKit dev server on port 5174')
  console.log('   - Ollama with gemma3-legal:latest model')
  console.log('   - Docker containers (postgres, redis)')
  console.log('   - GPU acceleration (optional)')

  return results
}

// Run the comprehensive test
runComprehensiveTest().catch(error => {
  console.error('💥 Test suite failed:', error)
  process.exit(1)
})