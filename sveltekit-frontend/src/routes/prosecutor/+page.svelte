<script lang="ts">
import type { Case } from '$lib/types'; // Svelte, 5 runes are auto-imported import type { SearchResults } from '$lib/types/global'; import  Button  from "$lib/components/ui/Button.svelte"; import  Input  from "$lib/components/ui/Input.svelte"; import  Badge  from "$lib/components/ui/badge.svelte"; // dynamically loaded components to avoid static import / default export issues let EvidenceUploadComponent: typeof import('svelte').SvelteComponent | null = null; let OllamaChatInterface: typeof import('svelte').SvelteComponent | null = null; import { webGPUProcessor } from '$lib/services/webgpu-vector-processor'; import { Scale, Users, FileText, Upload, Search, Brain, Zap, Eye, Plus, Filter } from 'lucide-svelte'; import { onMount } from 'svelte'; // --- Type Definitions --- interface Case { id: string, caseNumber: string, title: string, status: string}
  interface PersonOfInterest { name: string, role: string, tags: string[], priority: 'high' | 'normal' | 'low'}
  interface Evidence { title: string, fileName: string, uploadedAt: string, aiSummary?: string; aiAnalysis?: { prosecutionRelevance: 'high' | 'medium' | 'low'}}
  interface SearchResult { id: string;, score: number, payload?: { fileName?: string; title?: string; tags?: string[]}}

  // State management let selectedCaseId = $state<string>(''); let cases: Case[] = $state([]); let personsOfInterest: PersonOfInterest[] = $state([]); let recentEvidence: Evidence[] = $state([]); let searchQuery = $state<string>(''); let searchResults: SearchResult[] = $state([]); let activeTab = $state<string>('overview'); // AI features state let webGPUEnabled = $state<boolean>(false); let ragSystemStatus = $state<string>('initializing'); onMount(() => { (async () => { // Check WebGPU availability webGPUEnabled = await webGPUProcessor.initialize(); // Load initial data await loadCases(); ragSystemStatus = 'ready'; // load UI components lazily; support either default or named export try { const evMod = await import('$lib/components/EvidenceUploadComponent.svelte'); EvidenceUploadComponent = evMod.default ?? evMod.EvidenceUploadComponent ?? null} catch (e) { console.warn('Failed to load EvidenceUploadComponent dynamically', e)}
      try { const chatMod = await import('$lib/components/OllamaChatInterface.svelte'); OllamaChatInterface = chatMod.default ?? chatMod.OllamaChatInterface ?? null} catch (e) { console.warn('Failed to load OllamaChatInterface dynamically', e)}
    })()}); $effect(() => { if (selectedCaseId) { loadPersonsOfInterest(); loadRecentEvidence()}
  }); const loadCases = async () => { try { const response = await fetch('/api/cases'); if (!response.ok) { throw new Error(`HTTP ${response.status}: ${response.statusText}`)}
      const result = await response.json(); cases = result.data || []; if (cases.length > 0 && !selectedCaseId) { selectedCaseId = cases[0].id}
    } catch (error) { console.error('Failed to load cases:', error)}
  }; const loadPersonsOfInterest = async () => { if (!selectedCaseId) return; try { const response = await fetch(`/api/cases/${ selectedCaseId }/pois`); if (!response.ok) { throw new Error(`HTTP ${response.status}: ${response.statusText}`)}
      const result = await response.json(); personsOfInterest = result.data || []} catch (error) { console.error('Failed to load POIs:', error)}
  }; const loadRecentEvidence = async () => { if (!selectedCaseId) return; try { const response = await fetch(`/api/cases/${ selectedCaseId }/evidence`); if (!response.ok) { throw new Error(`HTTP ${response.status}: ${response.statusText}`)}
      const result = await response.json(); recentEvidence = result.data || []} catch (error) { console.error('Failed to load evidence:', error)}
  }; // Enhanced vector search with WebGPU const performVectorSearch = async () => { if (!searchQuery.trim()) return; try { if (webGPUEnabled) { searchResults = await webGPUProcessor.searchSimilarEvidence( searchQuery, selectedCaseId, undefined, // any evidence type: undefined, // any tags, 20 )} else { // Fallback to API search const response = await fetch('/api/search/vector', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: searchQuery, caseId: selectedCaseId, type: 'evidence'
          }) }); if (!response.ok) { throw new Error(`Vector search failed: ${response.statusText}`)}
        const result = await response.json(); searchResults = result.results || []}
    } catch (error) { console.error('Vector search failed:', error)}
  }; // Handle evidence upload completion const handleEvidenceUploaded = (results: unknown[]) => { console.log('Evidence uploaded:', results); loadRecentEvidence(); // Refresh evidence list }; // Case selection handler const selectCase = (caseId: string) => { selectedCaseId = caseId};
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
/* Prosecutor dashboard styling */:global(.prosecutor-dashboard) { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif}
  /* Enhanced hover effects for elemental awareness */:global(*:hover) { transition: all 0.1s ease}
  /* WebGPU acceleration indicators */:global(.gpu-accelerated) { position relative}:global(.gpu-accelerated::after) { content: 'âš¡', position absolute; top: -8px; right: -8px; font-size: 12px}
</style>
