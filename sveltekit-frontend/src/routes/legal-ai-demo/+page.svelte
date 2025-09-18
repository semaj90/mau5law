<script lang="ts">
  import 'nes.css/css/nes.min.css';
    import LegalAIWorkflow from '$lib/components/legal/LegalAIWorkflow.svelte';
    import EvidenceBoardLayout from '$lib/components/layout/EvidenceBoardLayout.svelte';
    import EvidenceCard from '$lib/components/ui/EvidenceCard.svelte';
    import type { LegalDocumentResponse, RecommendationResponse } from '$lib/services/legal-ai-client';

    let workflowResults = $state({
        analysis: null,
        recommendations: null
    });

    function handleWorkflowComplete(event: CustomEvent) {
        const { analysisResult, recommendations } = event.detail;
        workflowResults.analysis = analysisResult;
        workflowResults.recommendations = recommendations;
        
        console.log('Workflow completed:', { analysisResult, recommendations });
    }

    function handleExportResults(event: CustomEvent) {
        const { analysisResult, recommendations } = event.detail;
        
        // Create exportable data
        const exportData = {
            timestamp: new Date().toISOString(),
            document_analysis: analysisResult,
            recommendations: recommendations,
            summary: {
                total_processing_time: (analysisResult?.processing_time_ms || 0) + (recommendations?.processing_time_ms || 0),
                confidence_scores: {
                    analysis: analysisResult?.confidence || 0,
                    recommendations: recommendations?.confidence_score || 0
                },
                legal_domain: analysisResult?.legal_domain || 'unknown',
                risk_level: analysisResult?.risk_assessment?.risk_level || 'unknown'
            }
        };

        // Download as JSON
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `legal-ai-analysis-${new Date().toISOString.split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Mock test data for development
    const mockTestData = {
        contractDispute: {
            filename: "software_license_dispute.pdf",
            content: "This is a software licensing agreement dispute between TechCorp and ServiceProvider LLC regarding exclusive use terms and alleged breach of contract with damages claimed of $2.5M.",
            caseFacts: [
                "Software licensing agreement dispute",
                "Alleged breach of exclusive use terms", 
                "Claimed damages of $2.5M",
                "Counter-claim of insufficient payment"
            ]
        },
        employmentCase: {
            filename: "wrongful_termination.pdf", 
            content: "Employee terminated after reporting safety violations, claims of retaliation and wrongful termination, alleged violation of whistleblower protections.",
            caseFacts: [
                "Employee terminated after reporting safety violations",
                "Claims of retaliation and wrongful termination",
                "Alleged violation of whistleblower protections",
                "Employer claims performance issues"
            ]
        }
    };

    function createMockFile(mockData: typeof mockTestData.contractDispute): File {
        const blob = new Blob([mockData.content], { type: 'application/pdf' });
        return new File([blob], mockData.filename, { type: 'application/pdf' });
    }
</script>

<svelte:head>
    <title>Legal AI Demo - End-to-End Workflow</title>
    <meta name="description" content="Demonstration of Legal AI services with QUIC and gRPC integration" />
</svelte:head>

<EvidenceBoardLayout
  title="LEGAL AI PLATFORM DEMO"
  caseInfo="QUIC + gRPC MICROSERVICES"
  demoMode={true}
  {rightPanel}
>
  {#snippet rightPanel()}
    <!-- System Status Panel -->
    <div class="nes-container is-rounded evidence-panel mb-4">
      <h3 class="nes-text is-primary mb-3">🏗️ System Architecture</h3>
      <div class="space-y-2">
        <EvidenceCard
          title="SvelteKit Frontend"
          description="Svelte 5 with TypeScript"
          status="active"
          type="frontend"
          connections={3}
        />
        <EvidenceCard
          title="QUIC Server"
          description="HTTP/3 legal-ai-quic-server.exe"
          status="active"
          type="server"
          connections={2}
        />
        <EvidenceCard
          title="Recommendation Engine"
          description="legal-recommendation-engine.exe"
          status="pending"
          type="service"
          connections={1}
        />
        <EvidenceCard
          title="Data Layer"
          description="Redis + Vector DB + Case DB"
          status="active"
          type="database"
          connections={4}
        />
      </div>
    </div>

    <!-- Active Tasks -->
    <div class="nes-container is-rounded evidence-panel">
      <h3 class="nes-text is-warning mb-3">🛠️ Development Tools</h3>
      <div class="space-y-2">
        <button
          class="nes-btn is-primary w-full text-xs"
          onclick={() => {
            const mockFile = createMockFile(mockTestData.contractDispute);
            console.log('Mock contract dispute file created:', mockFile);
          }}
        >
          📄 Test Contract Dispute
        </button>
        <button
          class="nes-btn is-success w-full text-xs"
          onclick={() => {
            const mockFile = createMockFile(mockTestData.employmentCase);
            console.log('Mock employment case file created:', mockFile);
          }}
        >
          👤 Test Employment Case
        </button>
      </div>
    </div>
  {/snippet}

    <!-- Main Demo Workflow -->
    <main class="space-y-6">
        <LegalAIWorkflow 
            oncomplete={handleWorkflowComplete}
            onexport={handleExportResults}
        />

        <!-- Technical Implementation Cards using Evidence Board Style -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EvidenceCard
                title="🚄 QUIC/HTTP3 Transport"
                description="Low-latency multiplexed streams with built-in encryption"
                status="active"
                type="protocol"
                connections={2}
            >
                {#snippet children()}
                    <div class="nes-container is-rounded bg-blue-50 p-2">
                        <ul class="text-xs space-y-1">
                            <li>• Built-in encryption (TLS 1.3)</li>
                            <li>• Efficient binary protocol</li>
                            <li>• Connection migration support</li>
                        </ul>
                    </div>
                {/snippet}
            </EvidenceCard>

            <EvidenceCard
                title="📋 gRPC Protobuffers"
                description="Type-safe API definitions with efficient binary serialization"
                status="active"
                type="protocol"
                connections={3}
            >
                {#snippet children()}
                    <div class="nes-container is-rounded bg-green-50 p-2">
                        <ul class="text-xs space-y-1">
                            <li>• Streaming RPC support</li>
                            <li>• Cross-language compatibility</li>
                            <li>• Schema evolution support</li>
                        </ul>
                    </div>
                {/snippet}
            </EvidenceCard>

            <EvidenceCard
                title="🐹 Go Microservices"
                description="High-performance concurrent processing with compiled deployment"
                status="active"
                type="service"
                connections={4}
            >
                {#snippet children()}
                    <div class="nes-container is-rounded bg-yellow-50 p-2">
                        <ul class="text-xs space-y-1">
                            <li>• Memory-efficient architecture</li>
                            <li>• Built-in health monitoring</li>
                            <li>• Docker containerization</li>
                        </ul>
                    </div>
                {/snippet}
            </EvidenceCard>

            <EvidenceCard
                title="⚡ Svelte 5 Frontend"
                description="Reactive UI with runes ($state, $derived) and TypeScript"
                status="active"
                type="frontend"
                connections={2}
            >
                {#snippet children()}
                    <div class="nes-container is-rounded bg-purple-50 p-2">
                        <ul class="text-xs space-y-1">
                            <li>• Real-time progress tracking</li>
                            <li>• Component-based architecture</li>
                            <li>• Hot module reloading</li>
                        </ul>
                    </div>
                {/snippet}
            </EvidenceCard>
        </div>

        <!-- Results Summary using Evidence Board Style -->
        {#if workflowResults.analysis || workflowResults.recommendations}
            <div class="nes-container is-rounded evidence-panel">
                <h3 class="nes-text is-success mb-4">📊 Workflow Results Summary</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#if workflowResults.analysis}
                        <EvidenceCard
                            title="Document Analysis"
                            description="Legal domain classification and analysis"
                            status="completed"
                            type="analysis"
                            connections={1}
                        >
                            {#snippet children()}
                                <div class="nes-container is-rounded bg-green-50 p-3">
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-xs">
                                            <span class="nes-text">Legal Domain:</span>
                                            <span class="nes-text is-primary">{workflowResults.analysis.legal_domain}</span>
                                        </div>
                                        <div class="flex justify-between text-xs">
                                            <span class="nes-text">Confidence:</span>
                                            <span class="nes-text is-success">{(workflowResults.analysis.confidence * 100).toFixed(1)}%</span>
                                        </div>
                                        <div class="flex justify-between text-xs">
                                            <span class="nes-text">Time:</span>
                                            <span class="nes-text">{workflowResults.analysis.processing_time_ms}ms</span>
                                        </div>
                                    </div>
                                </div>
                            {/snippet}
                        </EvidenceCard>
                    {/if}

                    {#if workflowResults.recommendations}
                        <EvidenceCard
                            title="Recommendations Generated"
                            description="AI-generated legal recommendations"
                            status="completed"
                            type="recommendations"
                            connections={workflowResults.recommendations.total_count}
                        >
                            {#snippet children()}
                                <div class="nes-container is-rounded bg-blue-50 p-3">
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-xs">
                                            <span class="nes-text">Total Count:</span>
                                            <span class="nes-text is-primary">{workflowResults.recommendations.total_count}</span>
                                        </div>
                                        <div class="flex justify-between text-xs">
                                            <span class="nes-text">Confidence:</span>
                                            <span class="nes-text is-success">{(workflowResults.recommendations.confidence_score * 100).toFixed(1)}%</span>
                                        </div>
                                        <div class="flex justify-between text-xs">
                                            <span class="nes-text">Time:</span>
                                            <span class="nes-text">{workflowResults.recommendations.processing_time_ms}ms</span>
                                        </div>
                                    </div>
                                </div>
                            {/snippet}
                        </EvidenceCard>
                    {/if}
                </div>
            </div>
        {/if}
    </main>
</EvidenceBoardLayout>

