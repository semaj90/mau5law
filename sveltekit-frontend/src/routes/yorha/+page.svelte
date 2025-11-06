<script lang="ts">
import type { SearchResult } from '$lib/types';
import type { Document } from '$lib/types';
import { goto } from '$app/navigation'; // Svelte 5 runes are auto-imported
// Removed: import * as YoRHaAPI from '$lib/components/three/yorha-ui/api/YoRHaAPIClient.svelte';
import YoRHaCommandCenter from '$lib/components/yorha/YoRHaCommandCenter.svelte';
import YoRHaCommandInterface from '$lib/components/yorha/YoRHaCommandInterface.svelte';
import { debounce, withAbort } from '$lib/yorha/constants';
import YoRHaNavCard from '$lib/components/yorha/YoRHaNavCard.svelte';
import { ensureLocalIndex, localSearch, isLocalIndexReady, getLocalDocumentCount, wasLoadedFromCache, mergeResults } from '$lib/yorha/localSearch';
import { initHybridLayer, reRankWithPgVector } from '$lib/yorha/hybridSearchManager';
import type { SystemMetrics, YoRHaModule, HolographicScene, CommandResult, LegalAISession } from '$lib/types/yorha-interface';

// Enhanced YoRHa system data with full metrics
let systemData = $state<SystemMetrics>({ cpu_usage: 45, memory_usage: 62, gpu_utilization: 78, network_latency: 23, active_processes: 12, security_level: 'HIGH', quantum_state: 'COHERENT', neural_activity: 87 });

// Enhanced YoRHa state management
let ragResult = $state<any>(null);
let searchResults = $state<SearchResult[]>([]);
let isLoading = $state<boolean>(false);
let activeSection = $state<string>('dashboard');
let layoutData = $state<any>(null);
let searchMode = $state<'local' | 'hybrid' | 'remote'>('hybrid');
let localIndexReady = $state<boolean>(false);
let localIndexCount = $state<number>(0);
let localLoadedFromCache = $state<boolean>(false);

// YoRHa interface state
let showCommandInterface = $state<boolean>(false);
let activeModule = $state<string>('dashboard');
let holographicMode = $state<boolean>(true);
let legalSession = $state<LegalAISession | null>(null);
let commandHistory = $state<CommandResult[]>([]);

$effect(() => {
  // Fire and forget async initialization
  (async () => {
    try {
      // dynamic import to avoid static type errors if the client module shape differs
      const clientModule: { loadLayout?: (path: string) => Promise<any>; startDataStreams?: () => void; default?: any } = await import('$lib/components/three/yorha-ui/api/YoRHaAPIClient');
      // Try common export shapes: named exports, default export or fallback
      const client = clientModule?.loadLayout || clientModule?.startDataStreams ? clientModule : clientModule?.default ? clientModule.default : null;

      if (client && typeof client.loadLayout === 'function') {
        // preferred: client provides a loadLayout API
        layoutData = await client.loadLayout('/api/yorha/layout');
      } else {
        // fallback: call the endpoint directly
        try {
          const resp = await fetch('/api/yorha/layout');
          if (resp.ok) layoutData = await resp.json();
          else console.warn('Fallback layout fetch failed with status', resp.status);
        } catch (err) {
          console.warn('Fallback layout fetch error:', err);
        }
      }
      if (client && typeof client.startDataStreams === 'function') {
        // start data streams if available on the client
        client.startDataStreams();
      } else {
        // optional: log that the client does not expose a startDataStreams function
        // (no-op otherwise)
        // console.info('YoRHaAPI client has no startDataStreams export; skipping.')
      }
    } catch (error) {
      console.warn('YoRHa layout not available or client import failed:', error);
    }
  })();
  // Update YoRHa system metrics periodically
  const interval = setInterval(() => {
    systemData = {
      ...systemData,
      cpu_usage: Math.max(20, Math.min(90, systemData.cpu_usage + (Math.random() - 0.5) * 10)),
      gpu_utilization: Math.max(30, Math.min(95, systemData.gpu_utilization + (Math.random() - 0.5) * 8)),
      memory_usage: Math.max(40, Math.min(85, systemData.memory_usage + (Math.random() - 0.5) * 6)),
      network_latency: Math.max(10, Math.min(100, systemData.network_latency + (Math.random() - 0.5) * 5)),
      neural_activity: Math.max(60, Math.min(100, systemData.neural_activity + (Math.random() - 0.5) * 4)),
      active_processes: Math.max( 8, Math.min(20, systemData.active_processes + Math.round((Math.random() - 0.5) * 2)) )
    };
  }, 3000);

  // Initialize legal AI session
  initializeLegalSession();

  return () => clearInterval(interval);
});

function navigateTo(path: string) { goto(path) }

  // Initialize legal AI session
  async function initializeLegalSession(): Promise<void> {
    try {
      const resp = await fetch('/api/v1/legal/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'yorha-user-001',
          case_id: `case-${Date.now()}`,
          context: {
            jurisdiction: 'Global',
            practice_area: ['AI Law', 'Tech Ethics', 'Data Privacy'],
            case_type: 'Investigation',
            priority_level: 8,
            security_classification: 'HIGH'
          }
        })
      });
      if (resp.ok) {
        legalSession = (await resp.json()) as LegalAISession;
        console.log('[YoRHa] Legal AI session initialized:', legalSession?.session_id);
      }
    } catch (error) {
      console.warn('[YoRHa] Legal session initialization failed:', error);
    }
  }

   // Enhanced command interface functions
  function toggleCommandInterface() { showCommandInterface = !showCommandInterface }
  function toggleHolographicMode() { holographicMode = !holographicMode }
  function switchModule(moduleName: string) { activeModule = moduleName; activeSection = moduleName }

  // API integration functions
  async function performRAGQuery(query: string = 'Legal case precedent analysis'): Promise<any> {
    isLoading = true;
    ragResult = null;
    const { promise, abort } = withAbort(async (signal: AbortSignal) => {
      const resp = await fetch('/api/yorha/enhanced-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context: 'legal_analysis' }),
        signal
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp.json();
    });
    try {
      const data = await promise;
      ragResult = data;
      systemData.active_processes += 1;
      activeSection = 'rag-results';
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error('RAG query failed', e);
    } finally {
      isLoading = false;
    }
    return () => abort();
  }

  async function performSemanticSearch(searchTerm: string = 'contract liability'): Promise<any> {
    isLoading = true;
    searchResults = [];
    let localResults: SearchResult[] = [];
    if (isLocalIndexReady() && (searchMode === 'local' || searchMode === 'hybrid')) {
      // localSearch may return raw objects; cast/normalize into SearchResult shape
      localResults = (localSearch(searchTerm, 50) as any[]).map((item: any, idx: number) => ({
        id: item?.id ?? `local-${idx + 1}`,
        title: item?.title ?? item?.name ?? `Document ${idx + 1}`,
        type: item?.type ?? 'Legal Document',
        relevance: Math.round((item?.relevance ?? Math.random()) * 100),
        status: item?.status ?? 'active',
        metadata: item,
        filename: item?.filename,
        documentType: item?.documentType,
        caseId: item?.caseId,
        processingStatus: item?.processingStatus
      })) as SearchResult[];
      if (searchMode === 'local') {
        searchResults = localResults; // Corrected assignment
        activeSection = 'search-results';
        isLoading = false;
        return;
      }
    }
    const { promise, abort } = withAbort(async (signal: AbortSignal) => {
      if (searchMode === 'local') return { results: [] }; // guard
      const resp = await fetch(`/api/yorha/legal-data?search=${encodeURIComponent(searchTerm)}&limit=25`, { signal });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp.json();
    });
    try {
      const data = await promise;
      const resultsArray = (data.results || []) as any[]; // Removed as: unknown
      const remote: SearchResult[] = resultsArray.map((item: any, index: number) => ({
        id: item?.id ?? `remote-${index + 1}`,
        title: item?.title ?? item?.name ?? `Document ${index + 1}`,
        type: item?.type ?? 'Legal Document',
        relevance: Math.round((item?.relevance ?? Math.random()) * 100),
        status: item?.status ?? 'active',
        metadata: item,
        filename: item?.filename,
        documentType: item?.documentType,
        caseId: item?.caseId,
        processingStatus: item?.processingStatus
      }));
      // mergeResults should accept SearchResult[]; ensure the merged result is typed
      searchResults = (searchMode === 'hybrid' ? mergeResults(localResults, remote) : remote) || [];
      activeSection = 'search-results';
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error('Search failed', e);
    } finally {
      isLoading = false;
    }
    return () => abort();
  }

  async function checkClusterHealth(): Promise<any> {
    isLoading = true;
    const { promise, abort } = withAbort(async (signal: AbortSignal) => {
      const resp = await fetch('/api/yorha/cluster-health', { signal });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp.json();
    });
    try {
      const healthData = (await promise) as any; // Removed as: unknown
      if
