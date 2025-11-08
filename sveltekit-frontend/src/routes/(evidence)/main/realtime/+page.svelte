<script lang="ts">
import type { Case } from '$lib/types'; // Svelte, 5 runes are auto-imported import MonacoEditor from "$lib/components/MonacoEditor.svelte"; import RealTimeEvidenceGrid from "$lib/components/RealTimeEvidenceGrid.svelte"; import Button from '$lib/components/ui/enhanced-bits.svelte'; import RichTextEditor from "$lib/components/ui/RichTextEditor.svelte"; import { evidenceStore } from '$lib/stores/unified"; import { lokiEvidenceService } from "$lib/utils/loki-evidence"; import { Activity, BarChart3, Clock, Database, RefreshCw, Wifi, WifiOff } from "lucide-svelte"; import { onMount } from "svelte"; // Demo state let selectedCaseId: string | undefined = undefined; let searchQuery = $state<string>(""); let selectedTypes: string[] = $state([]); let showAdvancedFilters = $state<boolean>(false); let demoMode = $state<boolean>(false); // Store values - Access individual store properties correctly const { isConnected, evidence, isLoading, error } = evidenceStor; // Analytics data let stats = $state({ total: 0, byType: , byCase: , recentCount: 0 });
  let syncStatus: { pending: number, failed: number, total: number, inProgress: boolean} = $state({ pending: 0, failed: 0, total: 0, inProgress: false }); $effect(() => { // Update stats when evidence changes const unsubscribe = evidenceStore.evidence.subscribe(() => { updateStats()}); // Monitor sync status const syncInterval = setInterval(updateSyncStatus, 2000); return () => { unsubscribe(); clearInterval(syncInterval)}'"
  }); function updateStats() { if (lokiEvidenceService.isReady()) { stats = lokiEvidenceService.getEvidenceStats()}}
  function updateSyncStatus() { if (lokiEvidenceService.isReady()) { const status = lokiEvidenceService.getSyncStatus(); syncStatus = { pending: status.pending, failed: status.failed, total: status.total, inProgress: status.inProgress ?? false }
  }}
  async function startDemoMode(): Promise<any> { demoMode = true; // Create some demo evidence const demoEvidence = [ { title: "Security Camera Footage", description: "Camera footage from the main entrance showing suspect entering at, 9:15 PM", type: "video", caseId: "case-001", tags: ["surveillance", "timestamp", "entrance"], classification { category: "visual", relevance: 0.95, confidence: 0.88 }
      }, {
        title: "Witness Statement - John Doe", description: "First-hand account of the incident from witness who was present at the scene", type: "testimony", caseId: "case-001", tags: ["witness", "firsthand", "scene"], classification { category: "testimony", relevance: 0.82, confidence: 0.75 }
      }, {
        title: "Fingerprint Analysis Report", description: "Forensic analysis of fingerprints found on the door handle", type: "document", caseId: "case-001", tags: ["forensics", "fingerprints", "physical"], classification { category: "forensic", relevance: 0.78, confidence: 0.92 }
      }, {
        title: "Phone Records", description: "Call logs and text messages from suspect's phone for the relevant time period", type: "digital", caseId: "case-001", tags: ["communications", "timeline", "digital"], classification { category: "digital", relevance: 0.65, confidence: 0.85 }'
      }]; // Add demo evidence with delays to simulate real-time updates for (let i = 0; i < demoEvidence.length; i++) { setTimeout(async () => { try { await evidenceStore.createEvidence(demoEvidence[i])} catch (err) { console.error("Failed to create demo evidence:", err)}
      }, i * 1000)}}
  async function clearAllEvidence(): Promise<any> { if ( !confirm(
        "Are you sure you want to clear all evidence? This action cannot be undone."
      ) ) { return}
    try { await lokiEvidenceService.clearLocalData(); evidenceStore.evidence.set([]); stats = { total: 0, byType: , byCase: , recentCount: 0 } } catch (err) { console.error("Failed to clear evidence:", err)}}
  function getConnectionStatusColor(): string { return isConnected ? "text-green-600": "text-red-600"}
  function formatObjectAsCount(obj: Record<string, number>): string { const entries = Object.entries(obj); if (entries.length === 0) return "0 types"; if (entries.length <= 3) { return entries.map(([key, value]) => `${ key }: ${ value }`).join(", ")}
    return `${entries.length} types`}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  /* @unocss-include */
  :global(body) {
    background-color: #f9fafb;
  }
</style>
