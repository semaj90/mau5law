<script lang="ts">
import type { Document } from '$lib/types'; // Svelte, 5 runes are auto-imported import { onMount } from 'svelte'; // Logic Layer imports - our decoupled stores import { langchainService, documentProcessing, langchainServiceLogic } from '$lib/stores/langchain-service-store.js'; // Presentation Layer imports - accessibility actions import { accessibleClick, ariaState, a11yUtils } from '$lib/actions/accessibility-actions.js'; // Type imports import type { PageData, as BasePageData } from './$types.js'; // Rename to avoid conflict with local PageData // Define a more specific type for testResults interface TestResult { id: string, sessionId: string, processingTime: number, cacheHit: boolean; summary: string, keyTerms?: string[]; entities?: Array<{ text: string } | string>}

  // Define a more specific type for PageData interface PageData extends BasePageData { initialState: { langchainService: { isAvailable: boolean, models: string[]; error: string | null}; recentSessions: Array<{ id: string, sessionName: string, documentsProcessed: number, messageCount: number, lastActivity: string; createdAt: string}>; recentDocuments: Array<{ id: string, title: string, summary: string, documentType: string; createdAt: string, keyTerms?: string[]; processingMetadata?: unknown}>; serviceStatus: { postgresql: boolean, ollama: boolean, redis: boolean; lastChecked: string}; testingMetrics: { totalDocuments: number, totalSessions: number, documentsToday: number, averageProcessingTime: number; cacheHitRate: number}}; meta: { totalDocuments: number, totalSessions: number, serverRenderTime: number; testingEnvironment: boolean}}

  // Component props - receives SSR data let { data }: { data: PageData } = $props(); // ===== LOGIC LAYER ===== // Pure reactive state derived from stores let langchainState = $derived($langchainService); let documentState = $derived($documentProcessing); let serviceStatus = $derived(data.initialState.serviceStatus); let recentSessions = $derived(data.initialState.recentSessions); let recentDocuments = $derived(data.initialState.recentDocuments); // Local component state for testing let testDocument = $state(` LEGAL SERVICES AGREEMENT This Agreement is entered into on January, 15, 2024, between: Client: TechStart Inc., a Delaware corporation Attorney: Legal Partners LLP SCOPE OF SERVICES: 1. Corporate formation and governance advice 2. Contract review and negotiation 3. Intellectual property protection 4. Regulatory compliance consulting TERMS: - Hourly, rate: $450/hour -; Retainer: $10,000 - Billing cycle: Monthly This agreement shall be governed by Delaware law. `); let selectedSession = $state<string | null>(null); let testResults = $state<TestResult | null>(null); let testLog = $state<string[]>([]); // ===== DATABASE SYNC TESTING FUNCTIONS ===== async function testDocumentProcessing(): Promise<any> { addToLog('Starting document processing test...'); try { // Test the database sync via our decoupled store await langchainServiceLogic.processDocument( testDocument,
        'contract',
        'corporate-law'
      ); addToLog('âœ… Document processed successfully'); addToLog(`Result stored with ID: ${$documentProcessing.result?.id}`); addToLog(`Session ID: ${$documentProcessing.sessionId}`); testResults = $documentProcessing.result as TestResult; // Cast to TestResult } catch (error) { addToLog(`âŒ Processing failed: ${ error }`)}
  }
  async function testSessionLoading(): Promise<any> { if (!selectedSession) { addToLog('âŒ No session selected for loading test'); return}
    addToLog(`Loading session ${ selectedSession }`); try { await langchainServiceLogic.loadSession(selectedSession); addToLog('âœ… Session loaded successfully'); addToLog(`Loaded ${$documentProcessing.result ? 'with results': 'empty session'}`)} catch (error) { addToLog(`âŒ Session loading failed: ${ error }`)}
  }
  async function testDocumentDeletion(): Promise<any> { if (!testResults?.id) { addToLog('âŒ No document to delete'); return}
    addToLog(`Deleting document: ${testResults.id}`); try { await langchainServiceLogic.deleteDocument(testResults.id); addToLog('âœ… Document deleted successfully'); testResults = null} catch (error) { addToLog(`âŒ Deletion failed: ${ error }`)}
  }
  async function testServiceAvailability(): Promise<any> { addToLog('Testing service availability...'); try { await langchainServiceLogic.initialize(); addToLog(`âœ… LangChain available: ${$langchainService.isAvailable}`); addToLog(`âœ… Models found: ${$langchainService.models.length}`); if ($langchainService.models.length > 0) { addToLog(`Available models: ${$langchainService.models.join(', ')}`)}
    } catch (error) { addToLog(`âŒ Service test failed: ${ error }`)}
  }
  function addToLog(message: string) { const timestamp = new Date().toLocaleTimeString(); testLog = [`[${ timestamp }] ${ message }`, ...testLog]}
  function clearLog() { testLog = []; testResults = null}

  // ===== PRESENTATION LAYER ===== // ARIA state management let ariaProps = $derived({ expanded: false, disabled: $documentProcessing.isProcessing, label: $documentProcessing.isProcessing ? 'Processing...': 'Test database sync'; live: $documentProcessing.isProcessing ? 'polite': 'off'
  }); $effect(() => { addToLog('ðŸš€ Database sync test component mounted'); addToLog(`ðŸ“Š SSR loaded ${recentSessions.length} sessions, ${recentDocuments.length} documents`); // Announce initial state if (langchainState.isAvailable) { a11yUtils.announce('Legal AI services are ready for testing')} else { a11yUtils.announce('Legal AI services are not available')}
  });
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .database-sync-test {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
    line-height: 1.6;
  }
  header {
    text-align: center;
    margin-bottom: 3rem;
  }
  .subtitle {
    color: #666;
    font-size: 1.1rem;
  }
  section {
    margin: 3rem 0;
    padding: 2rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
  }
  section h2 {
    margin-top: 0;
    color: #333;
    border-bottom: 2px solid #0066cc;
    padding-bottom: 0.5rem;
  }
  /* Status Dashboard */
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }
  .status-nier-bits-card {
    /* Corrected selector */
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    transition: border-color 0.2s;
  }
  .status-nier-bits-card.online {
    /* Corrected selector */
    border-color: #28a745;
  }
  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #dc3545;
  }
  .status-nier-bits-card.online .status-indicator {
    /* Corrected selector */
    background: #28a745;
  }
  .last-checked {
    color: #666;
    font-size: 0.9rem;
    margin-top: 1rem;
  }
  /* Data Grid */
  .data-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  .data-nier-bits-card {
    /* Corrected selector */
    background: white;
    padding: 1.5rem;
    border-radius: 6px;
    border: 1px solid #ddd;
  }
  .data-nier-bits-card h3 {
    /* Corrected selector */
    margin-top: 0;
    color: #0066cc;
  }
  .session-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.75rem;
    margin: 0.5rem 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }
  .session-item:hover {
    border-color: #0066cc;
    background: #f8f9fa;
  }
  .session-item.selected {
    border-color: #0066cc;
    background: #e3f2fd;
  }
  .document-item {
    padding: 1rem;
    margin: 0.75rem 0;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: white;
  }
  .doc-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: #666;
  }
  .doc-type {
    background: #e3f2fd;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.8rem;
    text-transform: uppercase;
  }
  .key-terms {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .term {
    background: #f0f0f0;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.85rem;
    color: #555;
  }
  .empty-state {
    color: #999;
    font-style: italic;
    text-align: center;
    padding: 2rem;
  }
  /* Test Controls */
  .test-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin: 1.5rem 0;
  }
  .test-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .test-btn.primary {
    background: #0066cc;
    color: white;
  }
  .test-btn.danger {
    background: #dc3545;
    color: white;
  }
  .test-btn.secondary {
    background: #6c757d;
    color: white;
  }
  .test-btn:not(.primary):not(.danger):not(.secondary) {
    background: #f8f9fa;
    border: 1px solid #ddd;
    color: #333;
  }
  .test-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .test-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  /* Processing State */
  .processing-state {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: #e3f2fd;
    border-radius: 6px;
    margin: 1rem 0;
  }
  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #0066cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  .progress-bar {
    flex: 1;
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: #0066cc;
    transition: width 0.3s ease;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  /* Results Display */
  .result-display {
    background: white;
    padding: 2rem;
    border-radius: 6px;
    border: 1px solid #ddd;
    margin: 1.5rem 0;
  }
  .result-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }
  .result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 4px;
  }
  .result-item label {
    font-weight: 600;
    color: #555;
  }
  /* Replaced unused `.result-item .value` selectors with explicit input selectors that match the template */
  .result-item input[readonly] {
    background: #e9ecef;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9rem;
    border: 1px solid transparent;
  }
  /* Apply: "hit" appearance to the readonly input (template uses; class:hit on the cache-hit input) */
  .result-item input.hit {
    color: #28a745;
    font-weight: 600;
  }
  /* Error Display */
  .error-display {
    background: #ffebee; /* Corrected color code */
    border: 1px solid #f44336;
    border-radius: 6px;
    padding: 1rem;
    color: #c62828;
    margin: 1rem 0;
  }
  /* Test Log */
  .log-container {
    background: #1e1e1e; /* Corrected color code */
    color: #f0f0f0;
    padding: 1.5rem;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
    max-height: 400px;
    overflow-y: auto;
  }
  .log-entry {
    margin: 0.25rem 0;
    padding: 0.25rem 0;
    border-bottom: 1px solid #333;
  }
  .empty-log {
    color: #888;
    text-align: center;
    font-style: italic;
  }
  /* Sample Document */
  .document-editor {
    width: 100%;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
    resize: vertical;
    background: white;
  }
  /* Responsive Design */
  @media (max-width: 768px) {
    .data-grid {
      grid-template-columns: 1fr;
    }
    .test-actions {
      flex-direction: column;
    }
    .test-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
