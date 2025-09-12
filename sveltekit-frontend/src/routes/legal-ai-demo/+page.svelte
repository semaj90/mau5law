<script lang="ts">
    import LegalAIWorkflow from '$lib/components/legal/LegalAIWorkflow.svelte';
    import type { LegalDocumentResponse, RecommendationResponse } from '$lib/services/legal-ai-client';

    let workflowResults = $state<{
        analysis: LegalDocumentResponse | null;
        recommendations: RecommendationResponse | null;
    }>({
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
        a.download = `legal-ai-analysis-${new Date().toISOString().split('T')[0]}.json`;
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

<div class="demo-page">
    <!-- Page Header -->
    <header class="page-header">
        <div class="header-content">
            <h1>⚖️ Legal AI Platform Demo</h1>
            <p class="subtitle">
                End-to-end demonstration of gRPC protobuffers, QUIC streaming, and Go microservices
            </p>
            
            <!-- Architecture Overview -->
            <div class="architecture-info">
                <h3>🏗️ System Architecture</h3>
                <div class="architecture-diagram">
                    <div class="component frontend">
                        <strong>SvelteKit Frontend</strong>
                        <small>Svelte 5 with TypeScript</small>
                    </div>
                    <div class="arrow">→</div>
                    <div class="component quic">
                        <strong>QUIC Server</strong>
                        <small>HTTP/3 legal-ai-quic-server.exe</small>
                    </div>
                    <div class="arrow">→</div>
                    <div class="component recommendation">
                        <strong>Recommendation Engine</strong>
                        <small>legal-recommendation-engine.exe</small>
                    </div>
                    <div class="arrow">→</div>
                    <div class="component data">
                        <strong>Data Layer</strong>
                        <small>Redis + Vector DB + Case DB</small>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Demo Workflow -->
    <main class="demo-content">
        <LegalAIWorkflow 
            on:complete={handleWorkflowComplete}
            on:export={handleExportResults}
        />
        
        <!-- Development Tools -->
        <div class="dev-tools">
            <h3>🛠️ Development Tools</h3>
            <p>Quick test with mock data (for development/testing):</p>
            
            <div class="mock-buttons">
                <button 
                    class="mock-btn contract"
                    onclick={() => {
                        const mockFile = createMockFile(mockTestData.contractDispute);
                        // Simulate file selection
                        console.log('Mock contract dispute file created:', mockFile);
                    }}
                >
                    📄 Test Contract Dispute
                </button>
                
                <button 
                    class="mock-btn employment"
                    onclick={() => {
                        const mockFile = createMockFile(mockTestData.employmentCase);
                        console.log('Mock employment case file created:', mockFile);
                    }}
                >
                    👤 Test Employment Case
                </button>
            </div>
        </div>

        <!-- Technical Details -->
        <div class="technical-details">
            <h3>🔧 Technical Implementation</h3>
            
            <div class="tech-grid">
                <div class="tech-card">
                    <h4>🚄 QUIC/HTTP3 Transport</h4>
                    <ul>
                        <li>Low-latency multiplexed streams</li>
                        <li>Built-in encryption (TLS 1.3)</li>
                        <li>Efficient binary protocol</li>
                        <li>Connection migration support</li>
                    </ul>
                </div>

                <div class="tech-card">
                    <h4>📋 gRPC Protobuffers</h4>
                    <ul>
                        <li>Type-safe API definitions</li>
                        <li>Efficient binary serialization</li>
                        <li>Streaming RPC support</li>
                        <li>Cross-language compatibility</li>
                    </ul>
                </div>

                <div class="tech-card">
                    <h4>🐹 Go Microservices</h4>
                    <ul>
                        <li>High-performance concurrent processing</li>
                        <li>Compiled binary deployment</li>
                        <li>Memory-efficient architecture</li>
                        <li>Built-in health monitoring</li>
                    </ul>
                </div>

                <div class="tech-card">
                    <h4>⚡ Svelte 5 Frontend</h4>
                    <ul>
                        <li>Reactive UI with runes ($state, $derived)</li>
                        <li>TypeScript integration</li>
                        <li>Real-time progress tracking</li>
                        <li>Component-based architecture</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Results Summary -->
        {#if workflowResults.analysis || workflowResults.recommendations}
            <div class="results-summary">
                <h3>📊 Workflow Results Summary</h3>
                
                {#if workflowResults.analysis}
                    <div class="summary-section">
                        <h4>Document Analysis</h4>
                        <div class="summary-stats">
                            <div class="stat">
                                <span class="stat-label">Legal Domain:</span>
                                <span class="stat-value">{workflowResults.analysis.legal_domain}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Confidence:</span>
                                <span class="stat-value">{(workflowResults.analysis.confidence * 100).toFixed(1)}%</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Processing Time:</span>
                                <span class="stat-value">{workflowResults.analysis.processing_time_ms}ms</span>
                            </div>
                        </div>
                    </div>
                {/if}

                {#if workflowResults.recommendations}
                    <div class="summary-section">
                        <h4>Recommendations Generated</h4>
                        <div class="summary-stats">
                            <div class="stat">
                                <span class="stat-label">Total Count:</span>
                                <span class="stat-value">{workflowResults.recommendations.total_count}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Confidence:</span>
                                <span class="stat-value">{(workflowResults.recommendations.confidence_score * 100).toFixed(1)}%</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Processing Time:</span>
                                <span class="stat-value">{workflowResults.recommendations.processing_time_ms}ms</span>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </main>

    <!-- Footer with Links -->
    <footer class="demo-footer">
        <div class="footer-content">
            <div class="footer-section">
                <h4>🔗 Service Endpoints</h4>
                <ul>
                    <li><code>https://localhost:4433</code> - QUIC Legal AI Server</li>
                    <li><code>http://localhost:8080</code> - Recommendation Engine</li>
                    <li><code>localhost:6379</code> - Redis Cache</li>
                </ul>
            </div>
            
            <div class="footer-section">
                <h4>📁 Project Files</h4>
                <ul>
                    <li><code>proto/legal_ai.proto</code> - gRPC definitions</li>
                    <li><code>legal-ai-quic-server.exe</code> - QUIC server binary</li>
                    <li><code>legal-recommendation-engine.exe</code> - Recommendation service</li>
                </ul>
            </div>
        </div>
    </footer>
</div>

<style>
    .demo-page {
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .page-header {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        padding: 2rem 0;
    }

    .header-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        text-align: center;
    }

    .page-header h1 {
        color: #1a202c;
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        font-weight: 700;
    }

    .subtitle {
        color: #4a5568;
        font-size: 1.125rem;
        margin-bottom: 2rem;
    }

    .architecture-info {
        background: #f7fafc;
        border-radius: 1rem;
        padding: 1.5rem;
        margin-top: 2rem;
    }

    .architecture-info h3 {
        color: #2d3748;
        margin-bottom: 1rem;
    }

    .architecture-diagram {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .component {
        background: white;
        padding: 1rem;
        border-radius: 0.75rem;
        border: 2px solid #e2e8f0;
        text-align: center;
        min-width: 150px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .component.frontend {
        border-color: #3182ce;
        background: #ebf8ff;
    }

    .component.quic {
        border-color: #38a169;
        background: #f0fff4;
    }

    .component.recommendation {
        border-color: #d69e2e;
        background: #fffbeb;
    }

    .component.data {
        border-color: #9f7aea;
        background: #faf5ff;
    }

    .component strong {
        display: block;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 0.25rem;
    }

    .component small {
        color: #718096;
        font-size: 0.75rem;
    }

    .arrow {
        font-size: 1.5rem;
        color: #4a5568;
        font-weight: bold;
    }

    .demo-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }

    .dev-tools {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 1rem;
        padding: 2rem;
        margin: 2rem 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .dev-tools h3 {
        color: #2d3748;
        margin-bottom: 1rem;
    }

    .dev-tools p {
        color: #4a5568;
        margin-bottom: 1rem;
    }

    .mock-buttons {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .mock-btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .mock-btn.contract {
        background: #3182ce;
        color: white;
    }

    .mock-btn.contract:hover {
        background: #2c5282;
        transform: translateY(-2px);
    }

    .mock-btn.employment {
        background: #38a169;
        color: white;
    }

    .mock-btn.employment:hover {
        background: #2f855a;
        transform: translateY(-2px);
    }

    .technical-details {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 1rem;
        padding: 2rem;
        margin: 2rem 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .technical-details h3 {
        color: #2d3748;
        margin-bottom: 1.5rem;
        text-align: center;
    }

    .tech-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
    }

    .tech-card {
        background: white;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .tech-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .tech-card h4 {
        color: #2d3748;
        margin-bottom: 1rem;
    }

    .tech-card ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .tech-card li {
        color: #4a5568;
        padding: 0.25rem 0;
        padding-left: 1rem;
        position: relative;
    }

    .tech-card li::before {
        content: "✓";
        position: absolute;
        left: 0;
        color: #38a169;
        font-weight: bold;
    }

    .results-summary {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 1rem;
        padding: 2rem;
        margin: 2rem 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .results-summary h3 {
        color: #2d3748;
        margin-bottom: 1.5rem;
        text-align: center;
    }

    .summary-section {
        margin-bottom: 2rem;
    }

    .summary-section h4 {
        color: #4a5568;
        margin-bottom: 1rem;
    }

    .summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .stat {
        background: white;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .stat-label {
        color: #718096;
        font-weight: 500;
    }

    .stat-value {
        color: #2d3748;
        font-weight: 600;
    }

    .demo-footer {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2rem 0;
        margin-top: 4rem;
    }

    .footer-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
    }

    .footer-section h4 {
        color: #cbd5e0;
        margin-bottom: 1rem;
    }

    .footer-section ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .footer-section li {
        color: #a0aec0;
        padding: 0.25rem 0;
    }

    .footer-section code {
        background: rgba(255, 255, 255, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.875rem;
    }

    @media (max-width: 768px) {
        .page-header h1 {
            font-size: 2rem;
        }

        .architecture-diagram {
            flex-direction: column;
        }

        .arrow {
            transform: rotate(90deg);
        }

        .demo-content {
            padding: 1rem;
        }

        .tech-grid {
            grid-template-columns: 1fr;
        }
    }
</style>